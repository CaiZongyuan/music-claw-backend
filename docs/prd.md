# Product Requirements Document: QQ 音乐歌单导入网易云能力

**Version**: 1.0
**Date**: 2026-03-08
**Author**: Sarah (Product Owner)
**Quality Score**: 96/100

---

## Executive Summary

本项目旨在为现有 Web 音乐播放器生态补齐“跨平台歌单迁移”能力，优先解决“从 QQ 音乐公开分享歌单读取歌曲元数据，并导入到网易云歌单”这一高价值场景。当前播放器已经具备网易云相关能力，但缺少一个独立、轻量、可解耦的后端服务来承接跨平台歌单解析、候选匹配、人工确认和批量导入流程。

该能力将以 `Bun + Hono` 后端作为 MVP 载体，前期服务于内部使用，优先在本地环境完成功能闭环；后续若依赖和架构允许，可再考虑部署到 Cloudflare 等轻量平台。产品设计上明确采用“先解析、再确认、后导入”的审慎流程，避免对 1000 首以上大歌单做黑盒式一键迁移，提升可控性、可解释性和导入成功率。

该功能将复用已存在的 QQ 音乐解析经验、参考 Python QQ 音乐 API 项目，并通过已安装的 `NeteaseCloudMusicApi` 完成网易云歌单创建、歌曲搜索与分批写入。对用户而言，最终体验应接近“Git merge 冲突解决”：系统自动处理大多数可明确匹配的歌曲，将未匹配、缺字段或多候选的歌曲单独归档，交给用户逐条确认。

---

## Problem Statement

**Current Situation**: 当前已有的参考项目可以从 QQ 音乐公开分享链接中读取部分歌单元信息，但在歌单歌曲过多时存在读取不完整的问题；同时，网易云写入能力虽然成熟，但尚未与 QQ 音乐歌单解析、批量匹配、人工确认这条流程打通。

**Proposed Solution**: 构建一个独立的 `Hono` 后端服务，支持解析 QQ 音乐公开歌单链接、输出标准化歌曲元数据、调用网易云 API 搜索候选歌曲、支持分页审阅与冲突处理，并在用户确认后分批导入至指定网易云歌单。

**Business Impact**: 该能力可显著增强现有 Web 音乐播放器的跨平台歌单管理价值，降低用户在平台迁移时的手工成本，并为未来开放为轻量公共服务提供可复用的后端基础。

---

## Success Metrics

**Primary KPIs:**
- QQ 歌单解析完整率: 对公开分享歌单的歌曲抓取完整率达到 95% 以上，以“目标歌单预期曲目数 vs 实际解析曲目数”衡量
- 网易云候选匹配率: 自动匹配出至少 1 个候选结果的歌曲占比达到 90% 以上，以“成功返回候选的歌曲数 / 总歌曲数”衡量
- 导入可执行率: 用户完成确认后可成功进入导入流程的歌曲占比达到 85% 以上，以“确认导入歌曲数 / 总歌曲数”衡量

**Validation**: 在 MVP 阶段通过内部测试歌单验证，覆盖小型歌单、中型歌单与 1000 首级大歌单；分别记录解析耗时、候选命中率、冲突比例、最终导入成功率，并形成测试样本基线。

---

## User Personas

### Primary: 重度歌单迁移用户
- **Role**: 现有 Web 音乐播放器的内部使用者/高级用户
- **Goals**: 将 QQ 音乐歌单迁移到网易云，并尽可能保留歌曲顺序与歌单结构
- **Pain Points**: 手工搜索和重建歌单成本高；大歌单难以完整迁移；错误匹配难以发现
- **Technical Level**: Intermediate

### Secondary: 轻量公开服务使用者
- **Role**: 希望快速迁移公开歌单的外部用户
- **Goals**: 通过简单链接输入完成歌单解析与导入
- **Pain Points**: 不愿安装复杂工具；难以处理未匹配歌曲；担心导入错误
- **Technical Level**: Novice to Intermediate

---

## User Stories & Acceptance Criteria

### Story 1: 解析 QQ 音乐歌单

**As a** 歌单迁移用户
**I want to** 输入 QQ 音乐公开分享链接并解析歌单内容
**So that** 我可以获得完整、可审阅的歌曲元数据列表

**Acceptance Criteria:**
- [ ] 用户提供有效的 QQ 音乐公开分享链接后，系统返回歌单基础信息与标准化歌曲列表
- [ ] 当歌单曲目较多时，系统仍能以分页或批次方式完整拉取，而不是仅返回部分元信息
- [ ] 当链接失效、访问受限或解析失败时，系统返回明确错误信息与可重试提示

### Story 2: 批量匹配网易云候选歌曲

**As a** 歌单迁移用户
**I want to** 基于解析出的歌曲元数据批量搜索网易云候选结果
**So that** 我可以在导入前确认匹配质量

**Acceptance Criteria:**
- [ ] 系统默认使用“歌名 + 歌手 + 专辑”作为优先匹配条件，并兼容缺失专辑时的降级匹配
- [ ] 系统为每首歌曲输出匹配状态，包括“唯一匹配”“未匹配”“多候选”“元数据不足”
- [ ] 对于 1000 首级大歌单，搜索结果支持分页展示，避免单页过载

### Story 3: 处理冲突并确认导入范围

**As a** 歌单迁移用户
**I want to** 像处理代码合并冲突一样审查未匹配或多候选歌曲
**So that** 我可以在导入前主动修正问题，避免错误写入网易云歌单

**Acceptance Criteria:**
- [ ] 系统将“未匹配”“多候选”“缺失字段”歌曲单独归档显示
- [ ] 用户可以逐首选择候选歌曲、跳过歌曲或保留待后续处理状态
- [ ] 用户确认前，系统不会自动将有争议歌曲加入导入队列

### Story 4: 分批导入网易云歌单

**As a** 歌单迁移用户
**I want to** 在确认无误后分批导入歌曲到网易云歌单
**So that** 我可以降低失败风险并获得清晰的导入进度反馈

**Acceptance Criteria:**
- [ ] 系统支持新建网易云歌单并写入已确认的歌曲列表
- [ ] 系统按批次导入歌曲，并返回每批次成功数、失败数与失败原因
- [ ] 当用户提供网易云登录态/cookie 时，系统可复用现有播放器会话进行导入，无需强耦合内置登录流程

---

## Functional Requirements

### Core Features

**Feature 1: QQ 音乐歌单解析**
- Description: 接收 QQ 音乐公开分享链接，提取歌单基础信息与歌曲元数据
- User flow: 用户提交分享链接 → 后端校验链接 → 调用解析逻辑分页抓取 → 输出歌单标题、简介、曲目总数、歌曲列表
- Edge cases: 歌单超大、分享链接格式变化、部分字段缺失、远端限流或返回不完整
- Error handling: 返回结构化错误码；区分“链接无效”“解析失败”“部分成功”“需要重试”

**Feature 2: 标准化歌曲元数据导出**
- Description: 将 QQ 音乐侧数据统一转换为系统内部的歌曲结构，便于后续搜索与展示
- User flow: 解析完成后 → 系统生成标准字段 → 输出文字版与结构化结果 → 前端展示供用户核对
- Edge cases: 歌曲无专辑名、多个歌手、标题包含版本后缀、翻译标题与别名
- Error handling: 缺失字段时标记数据质量等级，并进入待确认列表

**Feature 3: 网易云批量搜索与候选聚合**
- Description: 对标准化歌曲元数据调用网易云搜索 API，批量获取候选歌曲结果
- User flow: 用户确认发起搜索 → 系统按分页/批量请求网易云 → 汇总候选结果与匹配状态 → 返回可审阅列表
- Edge cases: 搜索无结果、候选过多、搜索结果与预期平台版本不一致、批量请求超时
- Error handling: 支持重试、断点续查与按页回查；失败项单独记录，不阻断全量流程

**Feature 4: 冲突审阅与人工确认**
- Description: 采用类似 Git merge 的冲突处理模式，对自动无法决策的歌曲进行人工裁决
- User flow: 系统自动分类 → 前端展示冲突列表 → 用户逐项选择候选或跳过 → 形成最终导入队列
- Edge cases: 候选歌曲都不正确、用户暂不处理某些歌曲、同一首歌重复出现
- Error handling: 保存冲突决议状态，确保用户刷新页面或分多次处理时可以恢复上下文

**Feature 5: 网易云歌单创建与分批导入**
- Description: 在用户提供现有网易云登录态后，创建歌单并将确认后的歌曲分批写入
- User flow: 用户选择“新建歌单并导入” → 提供或复用 cookie → 系统创建歌单 → 分批写入歌曲 → 返回导入报告
- Edge cases: cookie 失效、导入中途失败、歌曲已存在、歌单创建成功但部分歌曲导入失败
- Error handling: 支持部分成功报告、失败批次重试、导入结果回执与未导入清单下载

### Out of Scope
- 支持 QQ 音乐私有歌单、用户登录后读取本人歌单
- 支持 Apple Music、Spotify、YouTube Music 等更多目标平台
- 全自动无确认的一键迁移模式
- 第一阶段即适配 Cloudflare Workers 生产部署
- 歌单封面、简介、标签等网易云非核心字段的完整同步保证

---

## Technical Constraints

### Performance
- 单个中小型歌单解析接口应在可接受时间内返回首屏结果，并支持后续分页拉取
- 1000 首级歌单的全流程必须以分页和批处理模式执行，避免单次请求处理过重
- 网易云搜索和导入均需具备限流、重试和阶段性结果持久化能力

### Security
- MVP 不内置新的网易云账号登录体系，默认不存储长期凭据
- 需要导入时由客户端显式提供并复用现有播放器的网易云登录态/cookie
- 服务端应避免在日志中输出完整 cookie、敏感 token 或可复用会话信息

### Integration
- **QQ 音乐解析能力**: 参考 `/root/Projects/Frontend/qqmusic-api/GoMusic` 与 `/root/Projects/Frontend/qqmusic-api/QQMusicApi` 的实现思路，优先解决大歌单读取完整性
- **网易云能力**: 复用已安装的 `NeteaseCloudMusicApi` 完成歌曲搜索、歌单创建和歌曲写入
- **Web UI 集成**: 与 `/root/Projects/Frontend/music-claw` 对接，由前端承接文本确认、分页列表、冲突裁决和导入进度展示

### Technology Stack
- 后端框架: `Hono`
- 运行时: 本地优先使用 `Bun`
- 依赖: `NeteaseCloudMusicApi`
- 部署策略: 先完成本地服务 MVP，再评估云端兼容性与依赖裁剪方案

---

## MVP Scope & Phasing

### Phase 1: MVP (Required for Initial Launch)
- 输入 QQ 音乐公开分享链接并解析歌单
- 输出标准化歌曲元数据与文字确认视图
- 批量调用网易云搜索歌曲候选
- 提供分页结果与冲突分类
- 支持用户确认后创建网易云歌单并分批导入
- 提供本地 `GET /verify` HTML 验证页，默认填充真实 QQ 分享短链用于联调验证

**MVP Definition**: 用户可以从一个 QQ 音乐公开分享链接出发，完成“解析 → 核对 → 搜索 → 冲突处理 → 分批导入网易云歌单”的完整闭环，且整个流程默认运行在本地 `Bun` 服务中。

### Phase 2: Enhancements (Post-Launch)
- 优化匹配策略评分模型，提高自动唯一匹配比例
- 支持断点恢复和长任务状态追踪
- 提供导入任务历史记录与失败重试入口
- 更丰富的歌单字段同步能力

### Future Considerations
- 评估 Cloudflare Workers 或其他轻量平台部署可行性
- 支持更多来源平台或目标平台
- 提供公开服务模式下的访问频控、任务隔离与配额管理

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| QQ 音乐分享链接解析规则变化或大歌单抓取不完整 | High | High | 参考多个实现来源，设计分页抓取与回退策略，并保留解析器可替换能力 |
| 网易云搜索结果不稳定导致错误匹配 | High | High | 使用“歌名 + 歌手 + 专辑”优先策略，并将未匹配/多候选交由人工确认 |
| 1000 首级歌单导致接口超时或前端卡顿 | High | Medium | 全链路分页、批处理和增量展示，避免单次载荷过大 |
| 网易云 cookie 失效导致导入失败 | Medium | High | 仅在导入阶段校验 cookie，并提供失败提示与重新提交机制 |
| 后续云端部署与现有依赖不兼容 | Medium | Medium | MVP 先固定本地 Bun 运行，后续再抽象依赖和适配运行环境 |

---

## Dependencies & Blockers

**Dependencies:**
- `NeteaseCloudMusicApi`: 负责网易云歌曲搜索、歌单创建、歌曲导入
- QQ 音乐解析实现: 需要参考并整合现有 Go/Python 项目的成功经验
- `/root/Projects/Frontend/music-claw`: 承接前端交互、分页展示和冲突处理界面

**Known Blockers:**
- QQ 音乐公开分享链接在大歌单场景下的完整读取策略尚需验证
- 网易云搜索 API 的批量调用方式、节流策略和候选质量需要通过真实数据集验证
- 长流程任务是否需要状态持久化仍需在开发阶段依据实际耗时决定

---

## Appendix

### Glossary
- **标准化歌曲元数据**: 系统内部统一使用的歌曲结构，至少包含歌名、歌手、专辑、时长、来源平台标识
- **唯一匹配**: 网易云候选结果中存在一个置信度足够高的目标歌曲
- **冲突项**: 未匹配、多候选、字段缺失或人工判定不确定的歌曲条目
- **分批导入**: 将确认后的歌曲列表拆分为多个导入请求，逐批执行并反馈状态

### References
- 当前后端项目: `README.md`
- 当前后端依赖: `package.json`
- QQ 音乐参考实现: `/root/Projects/Frontend/qqmusic-api/GoMusic/README.md`
- QQ 音乐 Python API 参考: `/root/Projects/Frontend/qqmusic-api/QQMusicApi/README.md`
- Web UI 项目: `/root/Projects/Frontend/music-claw/README.md`

---

*This PRD was created through interactive requirements gathering with quality scoring to ensure comprehensive coverage of business, functional, UX, and technical dimensions.*
