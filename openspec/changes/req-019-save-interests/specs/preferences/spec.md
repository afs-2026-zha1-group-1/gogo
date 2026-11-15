# Spec Delta

## ADDED Requirements

### Requirement: 偏好接口的调用者身份与成员资格

系统 SHALL 通过 `X-User-Id` 请求头识别偏好接口的调用者，其值 SHALL 为已 seed 的
`app_user` 整数 id。该请求头是脚手架级身份替身，系统 SHALL NOT 将其视为可信凭证，
签发或校验凭证不在本能力范围内。

识别失败（缺失、非整数、不是已 seed 的用户）SHALL 返回 401 与 `code = USER_REQUIRED`，
且 SHALL NOT 读写任何偏好数据。

两个偏好端点 SHALL 只对该 `tripId` 的成员开放。调用者不是成员 SHALL 返回 403 与
`code = NOT_A_MEMBER`，且 SHALL NOT 在响应中返回任何成员的兴趣。

`tripId` 不存在 SHALL 返回 404 与 `code = TRIP_NOT_FOUND`。

判定顺序 SHALL 为「身份 → trip 存在性 → 成员资格」，与既有 `GET /api/trips/{id}`
保持一致。

#### Scenario: 缺少身份头

- **WHEN** 请求不带 `X-User-Id` 头
- **THEN** 响应状态为 401
- **AND** 响应体 `code` 为 `USER_REQUIRED`
- **AND** 该 trip 的偏好数据不发生任何变化

#### Scenario: 身份头指向不可用的用户

- **WHEN** `X-User-Id` 为 `99`（未 seed 的用户）或 `abc`（非整数）
- **THEN** 响应状态为 401
- **AND** 响应体 `code` 为 `USER_REQUIRED`
- **AND** 响应体不含任何成员的兴趣值

#### Scenario: 身份头前后空白被容忍

- **WHEN** `X-User-Id` 为 `" 2 "`（前后带空格）
- **THEN** 结果与 `X-User-Id: 2` 完全一致
- **AND** 该容忍 SHALL NOT 扩展到 `interests` 的取值（见「预定义兴趣清单」）

#### Scenario: 非成员被拒绝

- **GIVEN** Eve（`X-User-Id: 5`）不是 trip 1 的成员
- **WHEN** Eve 调用 `GET` 或 `PUT /api/trips/1/preferences`
- **THEN** 响应状态为 403
- **AND** 响应体 `code` 为 `NOT_A_MEMBER`
- **AND** 响应体不含任何成员的兴趣值
- **AND** trip 1 的 `member_preference` 不发生任何变化

#### Scenario: 未知 trip 先于成员资格被报告

- **WHEN** 调用者请求一个不存在的 tripId
- **THEN** 响应状态为 404
- **AND** 响应体 `code` 为 `TRIP_NOT_FOUND`
- **AND** 该结果与调用者是否属于其它 trip 无关

### Requirement: 预定义兴趣清单

系统 SHALL 定义且仅定义下列 7 项兴趣。线上传输值 SHALL 为 `label` 的精确字符串，
持久化值 SHALL 为对应的 `code`：

| label | code |
|---|---|
| `Art` | `art` |
| `Nature` | `nature` |
| `Culture` | `culture` |
| `History` | `history` |
| `Food` | `food` |
| `Shopping` | `shopping` |
| `Adventure` | `adventure` |

匹配 SHALL 逐字进行：系统 SHALL NOT 做大小写折叠、SHALL NOT 去除首尾空白、
SHALL NOT 接受别名、翻译或子串匹配。

清单 SHALL 由代码常量维护；本能力 SHALL NOT 依赖 `tag` 表、SHALL NOT 依赖
`/api/tags`，也 SHALL NOT 提供维护兴趣目录的写接口。

#### Scenario: 七项兴趣全部被接受

- **GIVEN** Ben（`X-User-Id: 2`）是 trip 1 的成员且尚无保存的兴趣
- **WHEN** Ben 提交 `{"interests":["Art","Nature","Culture","History","Food","Shopping","Adventure"]}`
- **THEN** 响应状态为 200
- **AND** 响应 `interests` 为同一组 7 个 label，顺序与请求一致
- **AND** 持久化的 `codes` 为 `["art","nature","culture","history","food","shopping","adventure"]`

#### Scenario: 大小写不符被拒绝

- **WHEN** 提交 `["art"]` 或 `["ART"]`
- **THEN** 响应状态为 400
- **AND** 响应体 `code` 为 `INTEREST_NOT_ALLOWED`

#### Scenario: 前后空白被拒绝

- **WHEN** 提交 `[" Art "]` 或 `["Art "]`
- **THEN** 响应状态为 400
- **AND** 响应体 `code` 为 `INTEREST_NOT_ALLOWED`

#### Scenario: 空字符串与近义值被拒绝

- **WHEN** 提交 `[""]`、`[" "]`、`["teleport"]` 或 `["foodie"]`
- **THEN** 响应状态为 400
- **AND** 响应体 `code` 为 `INTEREST_NOT_ALLOWED`

### Requirement: 保存成员兴趣

系统 SHALL 暴露 `PUT /api/trips/{tripId}/preferences`，请求体为
`{"interests": string[]}`，并 SHALL 以调用者身份整体替换其兴趣集合。

服务端 SHALL 对提交数组去重并保留首次出现的顺序，因此响应与持久化结果中同一兴趣
SHALL 至多出现一次。

校验 SHALL 在写入前整体完成：任一元素不在预定义清单内，系统 SHALL 以 400 与
`code = INTEREST_NOT_ALLOWED` 拒绝整个请求，其中合法元素 SHALL NOT 落地。

成功保存 SHALL 返回 200 与 `{"interests": [...]}`，内容为去重后的已保存集合。

空数组 SHALL 被接受并表示「清空兴趣」；系统 SHALL 保留该成员的记录并将持久化内容
置为空集合，SHALL NOT 删除记录。

同一成员同一 `kind` SHALL 至多存在一行记录，因此首次保存插入、后续保存覆盖；
重复提交相同集合 SHALL 幂等，持久化的 `payload` SHALL 不变（`updated_at` 允许刷新）。

请求体不是 JSON 对象、缺少 `interests` 字段、或 `interests` 不是字符串数组
（包括元素为 `null` 或数字）SHALL 返回 400 与 `code = INVALID_REQUEST`。

被拒绝的请求 SHALL NOT 写入任何行，也 SHALL NOT 修改既有记录的 `payload` 或
`updated_at`。

#### Scenario: 重复值被折叠为一次

- **GIVEN** Ben（`X-User-Id: 2`）是 trip 1 的成员且尚无保存的兴趣
- **WHEN** Ben 提交 `{"interests":["Art","Nature","Art"]}`
- **THEN** 响应状态为 200
- **AND** 响应体为 `{"interests":["Art","Nature"]}`
- **AND** 该成员的持久化 `payload` 解析后恰好含 `art`、`nature` 两个元素
- **AND** 该成员在 `member_preference` 中只有一行记录

#### Scenario: 同一集合重复提交保持幂等

- **GIVEN** Ben 已保存 `Art`、`Nature`
- **WHEN** Ben 再次提交 `{"interests":["Art","Nature"]}`
- **THEN** 响应状态为 200
- **AND** 响应体与持久化的 `payload` 均与提交前一致
- **AND** `member_preference` 中该成员仍只有一行记录

#### Scenario: 保存是整体替换而不是合并

- **GIVEN** Ben 已保存 `Art`、`Nature`
- **WHEN** Ben 提交 `{"interests":["Food"]}`
- **THEN** 响应状态为 200
- **AND** 响应体为 `{"interests":["Food"]}`
- **AND** 持久化的 `codes` 只含 `food`，`Art` 与 `Nature` 不再存在

#### Scenario: 空数组清空兴趣但保留记录

- **GIVEN** Ben 已保存 `Art`、`Nature`
- **WHEN** Ben 提交 `{"interests":[]}`
- **THEN** 响应状态为 200
- **AND** 响应体为 `{"interests":[]}`
- **AND** 该成员的记录仍然存在，持久化 `payload` 为 `{"codes":[]}`

#### Scenario: 非预定义值整体拒绝且已保存兴趣不变

- **GIVEN** Ben 已保存 `Art`、`Nature`
- **WHEN** Ben 提交 `{"interests":["teleportation"]}`
- **THEN** 响应状态为 400
- **AND** 响应体 `code` 为 `INTEREST_NOT_ALLOWED`
- **AND** 该成员的 `payload` 与 `updated_at` 与请求前逐字相同

#### Scenario: 合法与非法值混合时整体拒绝

- **GIVEN** Ben 已保存 `Art`、`Nature`
- **WHEN** Ben 提交 `{"interests":["Art","teleportation"]}`
- **THEN** 响应状态为 400
- **AND** 响应体 `code` 为 `INTEREST_NOT_ALLOWED`
- **AND** `Art` 未被追加或改写，该成员仍保存 `Art`、`Nature`

#### Scenario: 首次保存只产生一行记录

- **GIVEN** Ben 在 `member_preference` 中没有任何记录
- **WHEN** Ben 保存 `{"interests":["Art"]}`
- **THEN** 响应状态为 200
- **AND** `member_preference` 中 `(trip_id=1, user_id=2, kind='interest')` 恰好一行

#### Scenario: 请求结构非法被拒绝

- **WHEN** 请求体为 JSON 数组、缺少 `interests` 字段、`interests` 为字符串
  `"Art"`、或 `interests` 含 `null` 或数字
- **THEN** 响应状态为 400
- **AND** 响应体 `code` 为 `INVALID_REQUEST`
- **AND** 该成员的已保存兴趣不变

### Requirement: 读取成员兴趣

系统 SHALL 暴露 `GET /api/trips/{tripId}/preferences`，向该 trip 的成员返回全体成员的
兴趣明细：响应体为 `{"members": [ {"userId": <整数>, "interests": [<label>...] } ]}`。

成员对象 SHALL 只含 `userId` 与 `interests` 两个字段，SHALL NOT 含显示名或其它附加字段。
`members` SHALL 按 `userId` 升序排列，以便断言可重复。
从未保存过兴趣的成员 SHALL 以 `interests: []` 出现，因此本端点 SHALL NOT 省略成员行。

本端点 SHALL 是只读的：读取 SHALL NOT 新建或修改任何记录。

#### Scenario: 成员读回自己保存的集合

- **GIVEN** Ben 已保存 `Art`、`Nature`
- **WHEN** Ben 以 `X-User-Id: 2` 请求 `GET /api/trips/1/preferences`
- **THEN** 响应状态为 200
- **AND** `members` 中 `userId = 2` 的元素的 `interests` 为 `["Art","Nature"]`
- **AND** 该结果与保存响应一致（页面重新加载后仍可见）

#### Scenario: 未保存兴趣的成员返回空数组

- **GIVEN** Chloe（`X-User-Id: 3`）是成员但从未保存兴趣
- **WHEN** 任一成员读取偏好
- **THEN** `members` 中存在 `userId = 3` 的元素
- **AND** 其 `interests` 为 `[]`

#### Scenario: 成员之间互不覆盖

- **GIVEN** Ben 保存 `Art`，Chloe 保存 `Food`
- **WHEN** 任一成员读取偏好
- **THEN** `userId = 2` 的 `interests` 为 `["Art"]`
- **AND** `userId = 3` 的 `interests` 为 `["Food"]`

#### Scenario: 响应只含约定字段并按 userId 升序

- **WHEN** 任一成员读取偏好
- **THEN** `members` 的每个元素只含 `userId` 与 `interests`
- **AND** `userId` 按升序排列

#### Scenario: 读取不改变任何数据

- **GIVEN** Ben 已保存 `Art`
- **WHEN** 连续两次读取偏好
- **THEN** 两次响应相同
- **AND** 该成员的 `payload` 与 `updated_at` 均未变化

### Requirement: 偏好页面

前端 SHALL 在既有应用内提供偏好页 `#/trips/{tripId}/preferences`，并 SHALL 从行程详情页
提供进入该页的链接。

页面 SHALL 渲染 7 个预定义兴趣的选中态，其唯一来源是 `GET` 返回值中与当前身份
（顶部身份选择器）匹配的那一条。

用户的选择 SHALL 由显式的「保存」动作一次性提交为当前选中集合；系统 SHALL NOT 在每次
点选时单独提交。

保存成功 SHALL 以响应体为准更新选中态；保存失败 SHALL 展示服务端 `message` 并把选中态
回退到服务端已知状态；加载失败 SHALL 展示错误与重试入口，且 SHALL NOT 把未加载或过期的
选择渲染为「已保存」。

页面 SHALL NOT 使用浏览器本地存储作为「已保存」的证据。

#### Scenario: 加载中

- **WHEN** 进入偏好页且 `GET` 尚未返回
- **THEN** 页面显示加载提示
- **AND** 兴趣选项与「保存」处于禁用状态

#### Scenario: 无记录时显示空态

- **GIVEN** 当前身份在该 trip 中没有保存过兴趣
- **WHEN** 页面加载完成
- **THEN** 7 个兴趣均未选中
- **AND** 用户可以直接选择并保存

#### Scenario: 已保存兴趣回显（页面重载）

- **GIVEN** Ben 已保存 `Art`、`Nature`
- **WHEN** Ben 打开偏好页
- **THEN** `Art` 与 `Nature` 为选中态
- **AND** 其余 5 项未选中

#### Scenario: 切换身份后按新身份重新加载

- **GIVEN** Ben 在偏好页看到自己的选中态
- **WHEN** 顶部身份选择器切换到 Chloe
- **THEN** 页面重新读取偏好
- **AND** 选中态为 Chloe 的集合，不保留 Ben 的选择

#### Scenario: 保存中禁用重复提交

- **WHEN** 用户点击「保存」且请求仍在途
- **THEN** 兴趣选项与「保存」按钮均禁用

#### Scenario: 保存成功以响应为准

- **WHEN** 保存请求返回 200
- **THEN** 选中态等于响应中的 `interests`
- **AND** 页面不残留错误提示

#### Scenario: 非法值保存失败时内联提示并回滚

- **GIVEN** 服务端已保存 `Art`、`Nature`
- **WHEN** 保存请求返回 400 且 `code` 为 `INTEREST_NOT_ALLOWED`
- **THEN** 页面展示响应 `message`
- **AND** 选中态回退为 `Art`、`Nature`

#### Scenario: 身份、成员资格或 trip 不存在

- **WHEN** `GET` 或 `PUT` 返回 401、403 或 404
- **THEN** 页面展示对应的错误文本与返回入口
- **AND** 页面 SHALL NOT 渲染任何成员的已保存兴趣

#### Scenario: 加载失败

- **WHEN** `GET` 失败（网络不可达或非 2xx）
- **THEN** 页面展示错误文本与重试入口
- **AND** 页面 SHALL NOT 把空白或上一次的选择显示为「已保存」
