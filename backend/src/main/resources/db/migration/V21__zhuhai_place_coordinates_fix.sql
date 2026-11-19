-- 珠海演示行程导航坐标修正（V20 之后）。
-- 1) 圆明新园：存量库里被高德地理编码写成了「广东省珠海市」省级兜底点（坐标落在香洲区
--    中心，与园址相差约 3km），这里以真实园址坐标覆盖（OSM: New Yuanming park）。
-- 2) 返回酒店：day2 新增的返程站，地址簿补种子，避免落库时缺坐标只能现查。
INSERT OR IGNORE INTO place_cache (name, city, address, lat, lng, source) VALUES
 ('返回酒店', '珠海', '珠海市香洲区（入住酒店）', 22.280446, 113.575628, 'seed');

UPDATE place_cache
   SET address = '珠海市香洲区兰埔路 1 号圆明新园',
       lat = 22.245,
       lng = 113.5331,
       source = 'seed'
 WHERE name = '圆明新园' AND city = '珠海';