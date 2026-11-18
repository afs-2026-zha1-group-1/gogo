-- 站点名里的「主线·」前缀是生成器自带的路线展示标记，不属于站点名（站点名归用户所有）。
-- 清理存量主线站点与已投影的 plan_node 标题，让地图导航、「编辑站点」弹窗只看真实活动名。
UPDATE main_plan_stop
SET name = trim(substr(name, 4))
WHERE substr(name, 1, 2) = '主线'
  AND substr(name, 3, 1) IN ('·', '•', '・', '：', ':', '-', ' ')
  AND trim(substr(name, 4)) <> '';

UPDATE plan_node
SET title = trim(substr(title, 4))
WHERE branch_id = 'main'
  AND substr(title, 1, 2) = '主线'
  AND substr(title, 3, 1) IN ('·', '•', '・', '：', ':', '-', ' ')
  AND trim(substr(title, 4)) <> '';
