# GitHub Issue Plan: QQ 音乐歌单导入网易云 MVP

## Epic

### Title
`[Epic] QQ 音乐歌单导入网易云 MVP`

### URL
`https://github.com/CaiZongyuan/music-claw-backend/issues/1`

### Problem Statement
当前后端尚未形成可复用的跨平台歌单迁移闭环。需要基于 `docs/prd.md` 落地一个本地优先的 Bun + Hono 服务，支持从 QQ 音乐公开分享歌单读取歌曲元数据、搜索网易云候选结果、处理冲突项，并在人工确认后分批导入网易云歌单。

### Goals
- 打通 `解析 → 标准化 → 搜索 → 冲突处理 → 导入` 的 MVP 闭环
- 建立可测试、可分模块扩展的后端骨架
- 用 GitHub issues/PRs 承载后续 TDD 开发和审查流程

### Success Criteria
- 支持解析 QQ 音乐公开分享歌单并返回标准化歌曲列表
- 支持对标准化歌曲批量搜索网易云候选并分类匹配状态
- 支持冲突项分页查看、保留、跳过和手动选择
- 支持创建网易云歌单并按批次导入已确认歌曲
- 产出需求可追踪的自动化测试与测试用例文档

### Technical Notes
- 需求来源：`docs/prd.md`
- 本地运行时：`Bun`
- Web 框架：`Hono`
- 网易云能力：`NeteaseCloudMusicApi`
- 首阶段以本地 MVP 为目标，不在本 Epic 内解决云端部署适配

## Sub-Issues

### 1. `[Sub-task] Set up Bun test baseline and modular Hono skeleton`
- **Issue**: `#2`
- **URL**: `https://github.com/CaiZongyuan/music-claw-backend/issues/2`
- **Priority**: P0
- **Depends on**: none
- **Labels**: `type:feature`, `priority:p0`, `area:backend`
- **Acceptance Criteria**:
  - [ ] 将当前 `src/index.ts` 拆为可扩展的模块化后端骨架
  - [ ] 建立 `bun test` 可执行的测试基线与示例测试
  - [ ] 为后续 QQ 解析、匹配和导入流程定义共享类型与错误模型
  - [ ] `package.json` 暴露必要脚本，避免新增临时命令
- **Validation**: `bun test`

### 2. `[Sub-task] Implement QQ playlist parsing and normalized metadata`
- **Issue**: `#3`
- **URL**: `https://github.com/CaiZongyuan/music-claw-backend/issues/3`
- **Priority**: P0
- **Depends on**: `#2`
- **Labels**: `type:feature`, `priority:p0`, `area:parser`
- **Acceptance Criteria**:
  - [ ] 输入有效 QQ 音乐公开分享链接时返回歌单基础信息与标准化歌曲列表
  - [ ] 针对大歌单支持分页或批次抓取，不只返回部分曲目
  - [ ] 链接失效、访问受限或解析失败时返回明确错误信息
  - [ ] 标准化歌曲结构至少包含歌名、歌手、专辑、时长、来源平台标识
- **Validation**: `bun test tests/qq-playlist-parser.test.ts`

### 3. `[Sub-task] Implement Netease candidate search and match classification`
- **Issue**: `#4`
- **URL**: `https://github.com/CaiZongyuan/music-claw-backend/issues/4`
- **Priority**: P0
- **Depends on**: `#3`
- **Labels**: `type:feature`, `priority:p0`, `area:matching`
- **Acceptance Criteria**:
  - [ ] 默认使用“歌名 + 歌手 + 专辑”匹配，缺专辑时可降级
  - [ ] 为每首歌曲输出 `唯一匹配 / 未匹配 / 多候选 / 元数据不足` 状态
  - [ ] 对批量搜索结果支持分页返回，避免 1000 首级歌单单页过载
  - [ ] 对第三方搜索失败返回可诊断错误信息
- **Validation**: `bun test tests/match-classification.test.ts`

### 4. `[Sub-task] Implement conflict review and resolution state`
- **Issue**: `#5`
- **URL**: `https://github.com/CaiZongyuan/music-claw-backend/issues/5`
- **Priority**: P1
- **Depends on**: `#4`
- **Labels**: `type:feature`, `priority:p1`, `area:review`
- **Acceptance Criteria**:
  - [ ] 将未匹配、多候选、缺失字段歌曲按分类归档返回
  - [ ] 支持逐首选择候选歌曲、跳过歌曲或标记待后续处理
  - [ ] 用户确认前，不将有争议歌曲自动加入导入队列
  - [ ] 支持刷新或分页后恢复冲突处理状态
- **Validation**: `bun test tests/conflict-review.test.ts`

### 5. `[Sub-task] Implement Netease playlist creation and batch import`
- **Issue**: `#6`
- **URL**: `https://github.com/CaiZongyuan/music-claw-backend/issues/6`
- **Priority**: P1
- **Depends on**: `#5`
- **Labels**: `type:feature`, `priority:p1`, `area:import`
- **Acceptance Criteria**:
  - [ ] 支持在提供 cookie 后创建网易云歌单
  - [ ] 支持按批次导入已确认歌曲
  - [ ] 返回每批次成功数、失败数与失败原因
  - [ ] cookie 失效、部分失败、重复歌曲等情况有明确回执
- **Validation**: `bun test tests/import-playlist.test.ts`

### 6. `[Sub-task] Generate requirement-traceable test cases and docs`
- **Issue**: `#7`
- **URL**: `https://github.com/CaiZongyuan/music-claw-backend/issues/7`
- **Priority**: P1
- **Depends on**: `#6`
- **Labels**: `type:docs`, `priority:p1`, `area:qa`
- **Acceptance Criteria**:
  - [ ] 基于 `docs/prd.md` 生成完整测试用例文档
  - [ ] 每条核心需求至少映射到一个功能/边界/错误测试场景
  - [ ] 输出文件保存到 `tests/qq-playlist-import-test-cases.md`
- **Validation**: `test -f tests/qq-playlist-import-test-cases.md`

## TDD Start Point

首个 TDD issue 从 `#2` 开始。

- **Acceptance Criteria**: 为 MVP 建立模块化 Hono 骨架、共享类型、错误模型与可运行的 Bun 测试基线
- **Proposed Test Command**: `bun test`
- **Reason**: 它是后续 parser / matching / import issue 的依赖，先完成它能让后续每个子任务都走严格红绿重构。

## Current Blockers
- 当前工作区存在已暂存变更：`AGENTS.md`、`src/AGENTS.md`、`tests/AGENTS.md`
- 按 `tdd` 规则，在存在无关 staged changes 时，不应直接开始第一个 TDD checkpoint commit
