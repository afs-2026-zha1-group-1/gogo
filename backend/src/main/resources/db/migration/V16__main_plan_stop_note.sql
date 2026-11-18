-- 主线站点备注：详情页「编辑站点」弹窗把「地点」换成「备注」（地图按站名导航，位置不再单独维护）。
-- 地点列 location_name 保留给分队投影与历史数据，本迁移只新增可读写的备注列。
ALTER TABLE main_plan_stop ADD COLUMN note TEXT;
