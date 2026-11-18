-- US-090: "我的方案" lets a trip member edit each main-plan stop's start/end time and location.
-- main_plan_stop previously carried names and local HH:MM times only; the location is projected to
-- plan_node.location_name so the split boundaries keep a real place to show.
ALTER TABLE main_plan_stop ADD COLUMN location_name TEXT;
