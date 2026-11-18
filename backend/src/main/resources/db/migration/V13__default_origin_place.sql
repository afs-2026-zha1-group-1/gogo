-- US-079 R1（用户 2026-11-18 裁决）：首站统一固定出发点 = 珠海南方软件园。
-- 坐标 WGS-84：由高德 POI（软件园路1号）GCJ 22.372424,113.577651 反算，往返误差 <1m。
INSERT OR IGNORE INTO place_cache (name, city, address, lat, lng, source) VALUES
 ('珠海南方软件园', '珠海', '珠海市香洲区唐家湾镇软件园路1号南方软件园', 22.375463, 113.572607, 'seed');
