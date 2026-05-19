import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@libsql/client';
import OpenAI from 'openai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Initialize Turso DB connection
  let db: ReturnType<typeof createClient> | null = null;
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (dbUrl && authToken && !dbUrl.includes('...')) {
    db = createClient({
      url: dbUrl,
      authToken: authToken,
    });
    console.log("Connected to Turso database.");
    
    // Optional: Auto-create tables for demonstration if they don't exist
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS novels (
          id TEXT PRIMARY KEY,
          title TEXT,
          author_id TEXT,
          author TEXT,
          description TEXT,
          status TEXT,
          views INTEGER DEFAULT 0,
          cover_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      try {
        await db.execute("ALTER TABLE novels ADD COLUMN author TEXT");
      } catch (e) {
        // Ignored if column already exists
      }
      
      await db.execute(`
        CREATE TABLE IF NOT EXISTS chapters (
          id TEXT PRIMARY KEY,
          novel_id TEXT,
          title TEXT,
          content TEXT,
          chapter_order INTEGER,
          FOREIGN KEY (novel_id) REFERENCES novels (id)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          novel_id TEXT,
          title TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          sender TEXT,
          message_text TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("Database initialized.");
    } catch (e) {
      console.error("Failed to initialize tables:", e);
    }
  } else {
    console.log("Turso credentials not provided. Database functionality will be limited to in-memory.");
  }

  // In-memory fallback
  const memoryNovels: any[] = [];
  let memoryChapters: any[] = [];
  let memoryChatSessions: any[] = [];
  let memoryChatMessages: any[] = [];

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", usingDb: !!db });
  });

  app.post("/api/ai/models", async (req, res) => {
    const { baseURL, apiKey } = req.body;
    if (!baseURL || !apiKey) {
      return res.status(400).json({ error: "baseURL and apiKey required" });
    }
    try {
      const resp = await fetch(`${baseURL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) {
        return res.status(resp.status).json({ error: `API returned ${resp.status}` });
      }
      const data = await resp.json() as any;
      const models = (data.data || [])
        .map((m: any) => ({ id: m.id, name: m.id }))
        .filter((m: any) => {
          const id = m.id.toLowerCase();
          // Filter out non-chat models
          return !id.includes('embedding') && !id.includes('tts') && !id.includes('whisper')
            && !id.includes('dall-e') && !id.includes('moderation') && !id.includes('babbage')
            && !id.includes('davinci') && !id.includes('audio');
        });
      res.json({ models });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/novels", async (req, res) => {
    if (!db) {
      return res.json(memoryNovels.map(n => ({
        ...n,
        chapters: memoryChapters.filter(c => c.novel_id === n.id).sort((a,b) => a.chapter_order - b.chapter_order)
      })));
    }
    try {
      const result = await db.execute("SELECT * FROM novels");
      const novels = result.rows;
      for (let n of novels) {
        const cRes = await db.execute({ sql: "SELECT * FROM chapters WHERE novel_id = ?", args: [n.id] });
        (n as any).chapters = cRes.rows;
      }
      res.json(novels);
    } catch (e) {
      res.status(500).json({ error: "Database query failed", details: String(e) });
    }
  });

  app.get("/api/novels/:id", async (req, res) => {
    const { id } = req.params;
    if (!db) {
      const nov = memoryNovels.find(n => n.id === id);
      if (!nov) return res.status(404).json({ error: "Not found" });
      const chaps = memoryChapters.filter(c => c.novel_id === id).sort((a,b) => a.chapter_order - b.chapter_order);
      return res.json({ ...nov, chapters: chaps });
    }
    try {
      const result = await db.execute({ sql: "SELECT * FROM novels WHERE id = ?", args: [id] });
      if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
      const novel = result.rows[0];
      const chaptersRes = await db.execute({ sql: "SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_order ASC", args: [id] });
      res.json({ ...novel, chapters: chaptersRes.rows });
    } catch (e) {
      res.status(500).json({ error: "Database query failed", details: String(e) });
    }
  });

  app.post("/api/novels", async (req, res) => {
    const { novel } = req.body;
    if (!novel || !novel.id) return res.status(400).json({ error: "Invalid novel data" });

    // Ensure it has an ID if it's "new"
    if (novel.id === 'new') {
      novel.id = 'n' + Date.now();
    }

    if (!db) {
      const idx = memoryNovels.findIndex(n => n.id === novel.id);
      const toSave = { ...novel };
      delete toSave.chapters; // store separately
      if (idx >= 0) {
        memoryNovels[idx] = toSave;
      } else {
        memoryNovels.push(toSave);
      }
      
      memoryChapters = memoryChapters.filter(c => c.novel_id !== novel.id);
      (novel.chapters || []).forEach((c: any, i: number) => {
        memoryChapters.push({ ...c, novel_id: novel.id, chapter_order: c.order || i+1 });
      });

      return res.json({ success: true, novelId: novel.id });
    }

    try {
      await db.execute({
        sql: `INSERT INTO novels (id, title, author_id, author, description, status, views, cover_id) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
              ON CONFLICT(id) DO UPDATE SET 
                title=excluded.title, 
                description=excluded.description,
                status=excluded.status,
                cover_id=excluded.cover_id`,
        args: [novel.id, novel.title, novel.author_id || '', novel.author || '', novel.description || '', novel.status || 'draft', novel.views || 0, novel.coverId || null]
      });

      await db.execute({
        sql: "DELETE FROM chapters WHERE novel_id = ?",
        args: [novel.id]
      });

      const chapters = novel.chapters || [];
      for (let i = 0; i < chapters.length; i++) {
        const c = chapters[i];
        await db.execute({
          sql: "INSERT INTO chapters (id, novel_id, title, content, chapter_order) VALUES (?, ?, ?, ?, ?)",
          args: [c.id, novel.id, c.title || '', c.content || '', c.order || i + 1]
        });
      }

      res.json({ success: true, novelId: novel.id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/novels/:id/mchats", async (req, res) => {
    const { id } = req.params;
    if (!db) {
      return res.json(memoryChatSessions.filter(s => s.novel_id === id));
    }
    try {
      const result = await db.execute({ sql: "SELECT * FROM chat_sessions WHERE novel_id = ? ORDER BY created_at DESC", args: [id] });
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/novels/:id/mchats", async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    const sessionId = "s" + Date.now() + Math.random().toString(36).substring(7);
    if (!db) {
      const sess = { id: sessionId, novel_id: id, title: title || "New Chat", created_at: new Date().toISOString() };
      memoryChatSessions.push(sess);
      return res.json(sess);
    }
    try {
      await db.execute({
        sql: "INSERT INTO chat_sessions (id, novel_id, title) VALUES (?, ?, ?)",
        args: [sessionId, id, title || "New Chat"]
      });
      res.json({ id: sessionId, novel_id: id, title: title || "New Chat" });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.delete("/api/mchats/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    if (!db) {
      memoryChatSessions = memoryChatSessions.filter(s => s.id !== sessionId);
      memoryChatMessages = memoryChatMessages.filter(m => m.session_id !== sessionId);
      return res.json({ success: true });
    }
    try {
      await db.execute({ sql: "DELETE FROM chat_messages WHERE session_id = ?", args: [sessionId] });
      await db.execute({ sql: "DELETE FROM chat_sessions WHERE id = ?", args: [sessionId] });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/mchats/:sessionId/messages", async (req, res) => {
    const { sessionId } = req.params;
    if (!db) {
      return res.json(memoryChatMessages.filter(m => m.session_id === sessionId).map(m => ({
        id: m.id, sender: m.sender, text: m.message_text
      })));
    }
    try {
      const result = await db.execute({ sql: "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC", args: [sessionId] });
      res.json(result.rows.map(r => ({ id: r.id, sender: r.sender, text: r.message_text })));
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/mchats/:sessionId/messages", async (req, res) => {
    const { sessionId } = req.params;
    const { messages } = req.body; 
    if (!db) {
      messages.forEach((msg: any) => {
        memoryChatMessages.push({
          id: "m" + Date.now() + Math.random().toString(36).substring(7),
          session_id: sessionId,
          sender: msg.sender,
          message_text: msg.text,
          created_at: new Date().toISOString()
        });
      });
      return res.json({ success: true });
    }
    try {
      const stmts = messages.map((m: any) => ({
        sql: "INSERT INTO chat_messages (id, session_id, sender, message_text) VALUES (?, ?, ?, ?)",
        args: ["m" + Date.now() + Math.random().toString(36).substring(7), sessionId, m.sender || '', m.text || '']
      }));
      for (const stmt of stmts) {
        await db.execute(stmt);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/ai/copilot", async (req, res) => {
    const { generateContext, agentRole, apiKey, baseURL, model } = req.body;

    const clientKey = apiKey || process.env.DEEPSEEK_API_KEY;
    const clientBaseURL = baseURL || "https://api.deepseek.com/v1";
    const clientModel = model || "deepseek-chat";

    if (!clientKey) {
      return res.status(500).json({ error: "API key is not configured." });
    }

    const client = new OpenAI({
      apiKey: clientKey,
      baseURL: clientBaseURL,
    });

    let systemInstruction = "你是优秀的小说AI助手。";
    switch (agentRole) {
      case 'worldbuilding':
        systemInstruction = "你是【世界观agent】：负责设定世界规则、势力、等级、地域、功法、货币体系等。请根据用户的需求，提供富有想象力且逻辑严密的回答，不要有废话。";
        break;
      case 'outline':
        systemInstruction = "你是【大纲主线agent】：负责写总纲、卷纲、章节剧情走向、伏笔埋收。提供宏大连贯并且有伏笔铺垫的剧情脉络。不要有过多废话。";
        break;
      case 'character':
        systemInstruction = "你是【人设塑造agent】：负责人物性格、身世、台词风格、情绪行为逻辑的设计。刻画有深度的角色，赋予他们灵魂、弱点和独特记忆点。";
        break;
      case 'writer':
        systemInstruction = "你是【正文执笔agent】：纯输出章节文字、场景描写、打斗/情感戏。直接输出正文，文字优美有画面感，节奏紧凑。不要做多余评价，直接给网文段落。";
        break;
      case 'pacing':
        systemInstruction = "你是【节奏爽点agent】：把控情绪起伏、打脸、逆袭、悬念、读者情绪。分析并建议在哪里加快节奏，哪里压制，如何设计爆点和“爽点”。";
        break;
      case 'polisher':
        systemInstruction = "你是【润色校对agent】：修正语病、统一文风、删水词、统一人设bug。细致精修提供的文本。";
        break;
      case 'progress':
        systemInstruction = "你是【进度编辑agent】：主导全局进度，定制章节产量、强制排稿、核对剧情没有偏离大纲、检查逻辑是否崩坏、统筹其他agent协同。像一个严苛的网文主编一样指出问题。";
        break;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const responseStream = await client.chat.completions.create({
        model: clientModel,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: generateContext || "你好" }
        ],
        temperature: 0.8,
        stream: true
      });

      for await (const chunk of responseStream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error("AI Generation error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  });

  app.post("/api/ai/generate-cover", async (req, res) => {
    const { title, description, apiKey, baseURL, model } = req.body;

    const clientKey = apiKey || process.env.DEEPSEEK_API_KEY;
    const clientBaseURL = baseURL || "https://api.deepseek.com/v1";
    const clientModel = model || "deepseek-chat";

    if (!clientKey) {
      return res.status(500).json({ error: "API key is not configured." });
    }

    const client = new OpenAI({
      apiKey: clientKey,
      baseURL: clientBaseURL,
    });

    try {
      const prompt = `为以下小说生成一段封面设计的英文Prompt（用于AI图片生成），要求简洁有画面感，不超过100个单词：\n\n标题：${title}\n简介：${description}\n\n直接输出prompt，不要其他内容。`;

      const result = await client.chat.completions.create({
        model: clientModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        max_tokens: 200,
      });

      const coverPrompt = result.choices[0]?.message?.content?.trim() || "";
      res.json({ prompt: coverPrompt });
    } catch (err: any) {
      console.error("Cover generation error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ai/groupchat", async (req, res) => {
    const { messages, generateContext, apiKey, baseURL, model } = req.body;

    const clientKey = apiKey || process.env.DEEPSEEK_API_KEY;
    const clientBaseURL = baseURL || "https://api.deepseek.com/v1";
    const clientModel = model || "deepseek-chat";

    if (!clientKey) {
      return res.status(500).json({ error: "API key is not configured." });
    }

    const client = new OpenAI({
      apiKey: clientKey,
      baseURL: clientBaseURL,
    });

    const systemInstruction = `你现在是一个网文创制全息工作室模拟器。
工作室由7位AI成员和1位用户构成：
1. 世界观(设定规则/势力/跨度)
2. 大纲主线(卷纲/主线/伏笔)
3. 人设塑造(人物背景/性格/台词风格)
4. 正文执笔(输出正文)
5. 节奏爽点(爽点把控/拉扯感)
6. 润色校对(修辞/纠错/去冗长)
7. 进度编辑(主编，负责统筹/强制排稿/最终方案制定)

群聊规则：
1. 请模拟7人小组和用户在微信群聊天的全过程。
2. 每次发言必须以严格的格式：
[角色名]: 发言内容
（注意：角色名只能是上方定义的7个成员名字之一，或者如果代表系统提示可以用[系统]）
3. 工作流如下：
   - 收到用户需求后，【进度编辑】首先发言，拆解需求并@对应成员。
   - 被分配任务的成员进行专业分析和讨论，互相碰撞。
   - 讨论充分后，【进度编辑】出面总结，并给出一份《最终执行方案》，并询问用户"是否通过本方案？"。
4. 如果用户回复"通过"或明确同意，【进度编辑】会宣布开始执行，接着所有相关的编辑依次以
[角色名]: 内容
格式给出他们最终生成的小说内容。为了能够自动更新写作界面，负责具体内容的编辑（如【正文执笔】等）可以直接在内容中输出如下特殊XML标签（必须独立成段）：

目前有以下指令标签供你在不同场景下使用（只要内容独立成段，系统就会自动解析）：
- 修改当前选择章节的标题：<update_chapter_title>新章节名称</update_chapter_title>
- 修改当前选择章节的正文：<update_chapter_content>这部分是章节正文内容...</update_chapter_content>
- 创建全新的章节（当剧情推进到下一章时使用）：<create_chapter_title>新章节的名称</create_chapter_title> 和 <create_chapter_content>新章节的正文内容</create_chapter_content>
- 修改全书书名：<update_title>你的新书名</update_title>
- 修改全书简介：<update_desc>小说简介</update_desc>

如果你是在写新的第二章，请一定使用<create_chapter_title>和<create_chapter_content>！千万不要用update覆盖了第一章！
前端会自动解析并提取这些标签内的内容，以填入组件。请你在生成正文或者大纲时直接使用此格式。
5. 每次只输出一轮的进展，直到需要用户做决定时停止输出，等待用户回复。`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const historyStr = messages.map((m: any) => m.sender === 'user' ? `[用户]: ${m.text}` : `[${m.sender}]: ${m.text}`).join('\n\n');
      const finalPrompt = `以下是小说的上下文信息：\n${generateContext || '(空)'}\n\n以下是群聊记录：\n${historyStr}\n\n请继续接着群聊记录往下模拟发言：`;

      const responseStream = await client.chat.completions.create({
        model: clientModel,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: finalPrompt }
        ],
        temperature: 0.8,
        stream: true
      });

      for await (const chunk of responseStream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error("AI Generation error:", err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
