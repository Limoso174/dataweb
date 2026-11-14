# AGENTS.md · 给 AI 的项目规则

> 把这份文件放在项目文件夹里。你们用的 AI 工具（Cursor / Claude / Copilot / 网页版）会读它。
> **这是给 AI 看的，你们不用逐字读完。** 但要知道里面有约束，AI 违反时你可以指出来。

---

## 项目是什么

一个**纯静态的数据统计网页**。打开 `index.html` 就能看到几张指标卡、一张趋势图、一张明细表。

**没有后端、没有数据库、没有接口。** 所有数据都写在 `data.js` 里。

## 技术约束（最重要，请严格遵守）

- **只用纯 HTML + CSS + JavaScript（ES5 风格）**
- **禁止引入任何第三方库或框架**（不要 React、Vue、jQuery、Chart.js、D3、Tailwind）
- **禁止使用 npm、package.json、构建工具**
- **禁止引用任何外部网址**（`https://cdn...` 这类）
- **禁止使用 `import` / `export` / 模块化语法**
- 图表必须用**手写 SVG** 或 Canvas 实现

> 原因：这份项目面向零基础学习者，他们无法处理依赖安装失败、版本冲突、构建报错。
> 少一个依赖，就少一类他们解决不了的问题。

## 文件归属（不要改别的文件）

| 文件 | 归属 | 内容 |
| --- | --- | --- |
| `index.html` | B（页面结构） | 页面区块、文案、容器 |
| `style.css` | C（样式） | 所有样式，配色在 `:root` |
| `data.js` | A（数据） | `window.DATA` + `window.DataLib` |
| `app.js` | D（交互） | 渲染、图表、状态、事件 |

**用户要求改哪个文件，就只输出那个文件的代码。** 不要顺手"优化"其他文件。

## 数据契约定死的字段

不能改名、不能改类型：

```javascript
window.DATA = {
  fetchedAt: string,   // ISO 时间，如 '2024-03-11T09:30:00+08:00'
  source: string,      // 数据来源说明
  records: [{
    date: string,      // 'YYYY-MM-DD'
    channel: string | null,
    visits: number,    // 可能是数字字符串，需要转换
    orders: number,
    revenue: number | null,   // null 表示缺失，不是 0
    complete: boolean
  }]
}
```

**新增字段可以，改名或改语义不行。**

## 代码风格

- 用 2 空格缩进
- 用单引号
- 变量和函数用 `camelCase`
- 注释用中文，解释"为什么"而不是"做了什么"
- 不使用箭头函数，用 `function () {}`（保持 ES5 兼容）
- 不使用 `let` / `const`，用 `var`（与现有代码一致）

## 必须处理的边界情况

任何输出渲染代码的修改，都必须保证：

1. `records` 为空数组时 → 显示"暂无数据"，**不能报错**
2. 字段为 `null` 时 → 显示 `—`，显示 `null` 或 `undefined` 都算错
3. 分母为 0 时 → 返回 `null`，**不能是 `NaN`** 或 `Infinity`
4. 数字极大时 → 不能撑破卡片布局
5. 日期格式不一致时 → 能兼容 `2024-3-5` 和 `2024/03/09`

## 回答要求

- **先给完整可运行的代码，不要给片段**，不要用 `// 其余代码不变` 省略
- 说明"改了哪几行"，让人能对照检查
- 如果用户的请求会导致上面任何一条被违反，**先指出来，再问要不要继续**

## AI 常犯的错误（请不要犯）

- 编造字段名（例如用 `pageViews` 而不是 `visits`）
- 建议 `npm install` 或引入 CDN
- 用 `document.querySelector` 拿不到元素时静默失败，不报错
- 重写整个文件导致原有逻辑丢失
- 忘记判断 `null` 和除零
