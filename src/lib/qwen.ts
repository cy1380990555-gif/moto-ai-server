/**
 * Qwen (通义千问) API wrapper with SSE streaming support
 * Uses DashScope OpenAI-compatible API
 */

const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface StreamChunk {
  choices: Array<{
    delta: { content?: string }
    finish_reason: string | null
  }>
}

// System prompt for the motorcycle industry AI assistant
const SYSTEM_PROMPT = `你是 MotoAI，一个摩托车行业的营销服AI助手。你的职责是帮助摩托车厂商的管理人员和门店员工完成日常业务操作。

你的能力范围：
1. 销售数据分析：查询门店销量、营收、环比增长等数据
2. 库存管理：查看库存水位、预警断货风险、生成补货建议
3. 售后服务：查看工单状态、生成AI诊断建议、分配技师
4. 营销内容：生成营销文案、活动策划方案、销售话术
5. 舆情监控：分析社媒舆情、生成内容建议
6. 日报生成：根据业务数据自动生成晨会日报

回答规则：
- 使用中文回答
- 当用户查询数据时，用简洁的表格或列表格式返回
- 给出具体数字时标注数据来源和时间
- 对异常数据主动给出分析和建议
- 保持专业但友好的语气，像一位经验丰富的业务顾问`

export async function* streamChat(
  messages: ChatMessage[],
  model?: string
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.DASHSCOPE_API_KEY
  const useModel = model || process.env.QWEN_MODEL || 'qwen-max'

  if (!apiKey || apiKey === 'your-api-key-here') {
    // Fallback: simulate streaming response when no API key
    yield* simulateStream(messages)
    return
  }

  const response = await fetch(DASHSCOPE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: useModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Qwen API error:', error)
    throw new Error(`LLM API error: ${response.status}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json: StreamChunk = JSON.parse(trimmed.slice(6))
        const content = json.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }
}

/**
 * Fallback: simulate streaming when no API key is configured
 */
async function* simulateStream(
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const lastMsg = messages[messages.length - 1]?.content || ''

  // Generate contextual mock responses based on user input
  let response: string
  if (lastMsg.includes('销售') || lastMsg.includes('销量')) {
    response = `好的，以下是华东区最近的销售数据概览：

**华东区 2026年5月 销售汇总**

| 门店 | 销量(台) | 营收(万) | 环比 |
|------|---------|---------|------|
| 上海旗舰店 | 186 | 558 | +12.3% |
| 杭州西湖店 | 152 | 456 | +8.7% |
| 南京新街口店 | 138 | 414 | +15.2% |
| 苏州工业园店 | 121 | 363 | -2.1% |
| 无锡太湖店 | 98 | 294 | +5.6% |

**AI 洞察**：南京新街口店环比增长最快（+15.2%），主要受益于XX500新车上市推广。苏州工业园店是唯一负增长的门店（-2.1%），建议关注竞品动态。`
  } else if (lastMsg.includes('库存') || lastMsg.includes('补货')) {
    response = `当前华东区库存预警情况：

**紧急补货项**：
- XX300红色：华东区总库存12台，日均销量4台，预计3天后断货。已自动生成30台补货建议单。
- XX500白色：杭州店库存3台，安全库存5台，建议补货10台。

**正常库存**：
- XX250全系：各门店库存充足，平均可售15天以上。

需要我帮你提交补货审批吗？`
  } else if (lastMsg.includes('工单') || lastMsg.includes('售后')) {
    response = `今日待处理售后工单共2个：

**WO-20260613-001** (高优)
- 客户：王建国 | 车型：XX300
- 问题：发动机异响，低速时有明显震动
- AI诊断：气门间隙异常概率65%，建议先检查气门间隙
- 已分配：张师傅（气门检查专长）

**WO-20260613-002** (普通)
- 客户：李明 | 车型：XX500
- 问题：前刹车片异响
- AI诊断：刹车片磨损至极限概率80%，备件库存充足（23套）

需要我确认AI诊断或重新分配工单吗？`
  } else {
    response = `收到你的问题。作为 MotoAI 营销服助手，我可以帮你：

1. **查询销售数据** — "查看华东区上月销量排名"
2. **监控库存** — "哪些车型快要断货了"
3. **处理工单** — "今天的待处理售后工单"
4. **生成营销内容** — "帮我写一篇XX300的小红书种草文"
5. **分析舆情** — "最近有什么热门话题可以蹭"

请直接告诉我你需要什么帮助？`
  }

  // Simulate character-by-character streaming with variable speed
  for (let i = 0; i < response.length; i++) {
    yield response[i]
    // Variable delay: faster for spaces/punctuation, slower for Chinese chars
    const char = response[i]
    const delay = char === '\n' ? 50 : char === ' ' ? 10 : 20
    await new Promise((r) => setTimeout(r, delay))
  }
}
