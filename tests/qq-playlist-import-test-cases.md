# Test Cases: QQ 音乐歌单导入网易云 MVP

## Overview
- **Feature**: QQ 音乐歌单导入网易云 MVP
- **Requirements Source**: `docs/prd.md`
- **Test Coverage**: 覆盖 QQ 歌单解析、网易云候选匹配、冲突处理、分批导入、错误处理与状态恢复
- **Last Updated**: 2026-03-08

## Test Case Categories

### 1. Functional Tests

#### TC-F-001: 成功解析 QQ 公开分享歌单
- **Requirement**: Story 1 / 有效 QQ 链接返回歌单基础信息与标准化歌曲列表
- **Priority**: High
- **Preconditions**:
  - 提供可访问的 QQ 音乐公开分享歌单链接
- **Test Steps**:
  1. 提交一个有效 QQ 歌单分享链接
  2. 调用歌单解析接口或服务
  3. 查看返回的歌单与歌曲列表
- **Expected Results**:
  - 返回歌单 `id`、标题、曲目数
  - 返回标准化歌曲结构：歌名、歌手、专辑、时长、来源平台标识
- **Postconditions**: 可进入网易云候选匹配阶段

#### TC-F-002: 大歌单分页抓取完整曲目
- **Requirement**: Story 1 / 大歌单支持分页或批次方式完整拉取
- **Priority**: High
- **Preconditions**:
  - 提供一个 1000 首级或模拟多页歌单数据源
- **Test Steps**:
  1. 使用大歌单链接发起解析
  2. 观察后端分页/批次抓取过程
  3. 核对目标曲目数与最终解析曲目数
- **Expected Results**:
  - 系统分多页或多批次获取数据
  - 返回曲目数与歌单声明总数一致，或差异有明确说明
- **Postconditions**: 大歌单可进入候选匹配阶段

#### TC-F-003: 网易云候选唯一匹配
- **Requirement**: Story 2 / 默认使用“歌名 + 歌手 + 专辑”匹配
- **Priority**: High
- **Preconditions**:
  - 已有标准化歌曲数据
  - 网易云搜索能力可用
- **Test Steps**:
  1. 对一首歌名、歌手、专辑都完整的歌曲执行匹配
  2. 查看搜索请求参数与返回结果
- **Expected Results**:
  - 查询条件包含歌名、歌手、专辑
  - 返回 1 个高置信候选时标记为“唯一匹配”
- **Postconditions**: 该歌曲可直接进入导入候选队列

#### TC-F-004: 缺专辑时降级匹配
- **Requirement**: Story 2 / 缺失专辑时兼容降级匹配
- **Priority**: High
- **Preconditions**:
  - 已有缺专辑字段的标准化歌曲
- **Test Steps**:
  1. 对缺失专辑信息的歌曲执行匹配
  2. 查看搜索请求参数
- **Expected Results**:
  - 查询条件仅包含歌名和歌手
  - 系统仍能返回匹配状态与候选结果
- **Postconditions**: 可进入冲突处理或导入队列

#### TC-F-005: 冲突项可分类查看并分页浏览
- **Requirement**: Story 3 / 系统将未匹配、多候选、缺失字段歌曲单独归档显示
- **Priority**: High
- **Preconditions**:
  - 已有包含多种匹配状态的结果集
- **Test Steps**:
  1. 打开冲突处理视图或服务接口
  2. 按“多候选”“未匹配”“缺失字段”分别查看
  3. 在冲突项较多时切换分页
- **Expected Results**:
  - 各类冲突项分组展示
  - 分页信息正确：页码、页大小、总数、总页数
- **Postconditions**: 用户可以逐项决策

#### TC-F-006: 手动选择候选后进入导入队列
- **Requirement**: Story 3 / 用户可逐首选择候选歌曲
- **Priority**: High
- **Preconditions**:
  - 某歌曲处于“多候选”状态并存在候选列表
- **Test Steps**:
  1. 为该歌曲选择一个候选歌曲
  2. 刷新或重新读取冲突状态
  3. 查看导入队列
- **Expected Results**:
  - 系统保存所选候选 ID
  - 刷新后仍能恢复该决策
  - 该歌曲进入导入队列
- **Postconditions**: 该歌曲成为“待导入”状态

#### TC-F-007: 创建网易云歌单并按批次导入
- **Requirement**: Story 4 / 创建歌单并分批导入确认歌曲
- **Priority**: High
- **Preconditions**:
  - 已有已确认的导入队列
  - 提供有效网易云 cookie
- **Test Steps**:
  1. 提交导入请求，指定歌单名与导入队列
  2. 观察歌单创建结果
  3. 查看每批次导入回执
- **Expected Results**:
  - 返回新歌单 ID
  - 按配置的批次大小分批导入
  - 每批次返回成功数、失败数、失败原因
- **Postconditions**: 形成完整导入报告

### 2. Edge Case Tests

#### TC-E-001: QQ 分享链接格式无效
- **Requirement**: Story 1 / 链接失效或解析失败时给出明确错误
- **Priority**: High
- **Preconditions**:
  - 提供非 QQ 域名或缺少歌单 ID 的链接
- **Test Steps**:
  1. 提交无效链接
- **Expected Results**:
  - 返回 `INVALID_QQ_SHARE_URL` 或等价错误码
  - HTTP 状态或错误语义明确说明无法解析
- **Postconditions**: 不进入后续匹配流程

#### TC-E-002: 歌曲缺失标题或歌手
- **Requirement**: Story 2 / 输出“元数据不足”状态
- **Priority**: Medium
- **Preconditions**:
  - 标准化歌曲缺失标题或歌手信息
- **Test Steps**:
  1. 对该歌曲执行候选匹配
- **Expected Results**:
  - 不发起网易云搜索请求
  - 匹配状态标记为“元数据不足”
- **Postconditions**: 歌曲进入冲突处理列表

#### TC-E-003: 多候选评分接近
- **Requirement**: Story 2 / 输出“多候选”状态
- **Priority**: Medium
- **Preconditions**:
  - 网易云返回 2 个以上高分候选且评分接近
- **Test Steps**:
  1. 对目标歌曲执行匹配
- **Expected Results**:
  - 返回多个候选结果
  - 匹配状态标记为“多候选”
- **Postconditions**: 用户必须人工选择或跳过

#### TC-E-004: 用户将冲突歌曲标记为稍后处理
- **Requirement**: Story 3 / 用户可保留待后续处理状态
- **Priority**: Medium
- **Preconditions**:
  - 存在冲突歌曲
- **Test Steps**:
  1. 将冲突歌曲标记为“待后续处理”
  2. 刷新页面或重新读取状态
- **Expected Results**:
  - 系统保存 deferred 状态
  - 该歌曲不进入当前导入队列
- **Postconditions**: 后续可继续处理该歌曲

### 3. Error Handling Tests

#### TC-ERR-001: QQ 歌单无访问权限
- **Requirement**: Story 1 / 访问受限返回明确错误信息
- **Priority**: High
- **Preconditions**:
  - 模拟 QQ 返回权限拒绝或公开访问受限
- **Test Steps**:
  1. 发起歌单解析
- **Expected Results**:
  - 返回 `QQ_PLAYLIST_ACCESS_DENIED` 或等价错误
  - 提示用户该歌单不可公开访问
- **Postconditions**: 流程终止在解析阶段

#### TC-ERR-002: 网易云搜索上游失败
- **Requirement**: Story 2 / 第三方搜索失败返回可诊断错误
- **Priority**: High
- **Preconditions**:
  - 模拟网易云搜索 API 超时或异常
- **Test Steps**:
  1. 发起候选匹配
- **Expected Results**:
  - 返回 `NETEASE_SEARCH_FAILED` 或等价错误
  - 错误结果包含至少 trackId/trackTitle 等诊断上下文
- **Postconditions**: 不误标记为“未匹配”

#### TC-ERR-003: 网易云 cookie 失效
- **Requirement**: Story 4 / cookie 失效时有明确回执
- **Priority**: High
- **Preconditions**:
  - 提供过期或无效 cookie
- **Test Steps**:
  1. 发起创建歌单并导入请求
- **Expected Results**:
  - 返回 `NETEASE_COOKIE_INVALID` 或等价错误
  - 不继续执行歌曲批量写入
- **Postconditions**: 用户需重新提供 cookie

#### TC-ERR-004: 分批导入部分失败并含重复歌曲
- **Requirement**: Story 4 / 返回每批次失败原因
- **Priority**: High
- **Preconditions**:
  - 模拟某批次包含重复歌曲或上游拒绝写入
- **Test Steps**:
  1. 发起分批导入
  2. 查看批次导入报告
- **Expected Results**:
  - 成功数与失败数正确统计
  - 失败列表中包含失败曲目和原因，如“duplicate track”
- **Postconditions**: 用户可据报告重试或清理数据

### 4. State Transition Tests

#### TC-ST-001: 冲突歌曲从 pending 到 selected_candidate
- **Requirement**: Story 3 / 用户可逐首选择候选歌曲
- **Priority**: High
- **Preconditions**:
  - 会话中存在多候选冲突歌曲
- **Test Steps**:
  1. 读取冲突项初始状态
  2. 选择一个候选
  3. 再次读取该冲突项
- **Expected Results**:
  - 初始状态为 `pending`
  - 更新后状态为 `selected_candidate`
  - 记录所选 candidateId
- **Postconditions**: 进入导入队列

#### TC-ST-002: 冲突歌曲从 pending 到 skipped
- **Requirement**: Story 3 / 用户可以跳过歌曲
- **Priority**: Medium
- **Preconditions**:
  - 会话中存在未匹配或多候选歌曲
- **Test Steps**:
  1. 执行跳过操作
  2. 再次读取状态与导入队列
- **Expected Results**:
  - 状态变为 `skipped`
  - 该歌曲不会出现在导入队列中
- **Postconditions**: 歌曲被排除在当前导入之外

#### TC-ST-003: 冲突歌曲从 pending 到 deferred 并跨刷新恢复
- **Requirement**: Story 3 / 保存冲突决议状态并支持恢复上下文
- **Priority**: Medium
- **Preconditions**:
  - 会话中存在元数据不足或未匹配歌曲
- **Test Steps**:
  1. 标记歌曲为 deferred
  2. 刷新页面或重新读取会话
- **Expected Results**:
  - 状态保持为 `deferred`
  - 该歌曲不进入导入队列
- **Postconditions**: 用户稍后可继续处理

## Test Coverage Matrix

| Requirement ID | Test Cases | Coverage Status |
|---------------|------------|-----------------|
| Story1-AC1 有效链接返回歌单和标准化列表 | TC-F-001 | ✓ Complete |
| Story1-AC2 大歌单分页/批次抓取 | TC-F-002 | ✓ Complete |
| Story1-AC3 失效/受限/失败错误提示 | TC-E-001, TC-ERR-001 | ✓ Complete |
| Story2-AC1 专辑优先匹配，缺专辑降级 | TC-F-003, TC-F-004 | ✓ Complete |
| Story2-AC2 输出 4 类匹配状态 | TC-E-002, TC-E-003, TC-ERR-002 | ✓ Complete |
| Story2-AC3 大歌单匹配结果分页 | TC-F-005 | ✓ Complete |
| Story3-AC1 冲突项分类归档 | TC-F-005 | ✓ Complete |
| Story3-AC2 选择/跳过/待后续处理 | TC-F-006, TC-E-004, TC-ST-001, TC-ST-002, TC-ST-003 | ✓ Complete |
| Story3-AC3 有争议歌曲不自动入队 | TC-F-006, TC-ST-002, TC-ST-003 | ✓ Complete |
| Story4-AC1 创建网易云歌单 | TC-F-007, TC-ERR-003 | ✓ Complete |
| Story4-AC2 分批导入并返回批次结果 | TC-F-007, TC-ERR-004 | ✓ Complete |
| Story4-AC3 cookie 失效中断导入 | TC-ERR-003 | ✓ Complete |

## Notes
- 当前自动化测试主要覆盖服务层行为，后续可补充 HTTP 路由级集成测试。
- 真实 QQ/网易云第三方接口稳定性仍需在联调环境用真实样本验证。
- 若后续增加断点恢复和任务历史，应补充新的状态机测试用例。
