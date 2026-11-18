-- US-079 路线1：站点地址/坐标在生成落库时持久化；place_cache 是"会长大的地址簿"
-- （种子预填 → 程序查坐标沉淀 → 人工补）。只加可空列，不动存量列与契约字段。
ALTER TABLE main_plan_stop ADD COLUMN address TEXT;
ALTER TABLE main_plan_stop ADD COLUMN lat REAL;
ALTER TABLE main_plan_stop ADD COLUMN lng REAL;

CREATE TABLE IF NOT EXISTS place_cache (
    name    TEXT NOT NULL,
    city    TEXT NOT NULL,
    address TEXT,
    lat     REAL,
    lng     REAL,
    source  TEXT NOT NULL DEFAULT 'seed',
    PRIMARY KEY (name, city)
);

-- 演示站点种子（真实 WGS-84 坐标；与前端 place-book 兜底逐字对齐）。
INSERT OR IGNORE INTO place_cache (name, city, address, lat, lng, source) VALUES
 ('City Hall MRT', 'Singapore', '150 North Bridge Rd, Singapore 179100', 1.2931, 103.852, 'seed'),
 ('National Gallery Singapore', 'Singapore', '1 St Andrew''s Rd, Singapore 179097', 1.2902, 103.8515, 'seed'),
 ('Gardens by the Bay', 'Singapore', '18 Marina Gardens Dr, Singapore 018953', 1.2816, 103.8636, 'seed'),
 ('Merlion Park', 'Singapore', '1 Fullerton Rd, Singapore 049213', 1.2868, 103.8545, 'seed'),
 ('西九文化区 M+ 博物馆', '香港', '香港西九文化区博物馆道 38 号 M+ 博物馆', 22.3009, 114.1595, 'seed'),
 ('天星小轮（尖沙咀 → 中环）', '香港', '香港尖沙咀天星码头（乘船往中环天星码头）', 22.2936, 114.1696, 'seed'),
 ('中环街市与半山扶梯', '香港', '香港中环皇后大道中 93 号中环街市 / 中环半山扶梯', 22.2837, 114.1555, 'seed'),
 ('中环至半山自动扶梯', '香港', '香港中环皇后大道中 93 号中环街市 / 中环半山扶梯', 22.2836, 114.1552, 'seed'),
 ('太平山顶与凌霄阁', '香港', '香港山顶山顶道 128 号凌霄阁', 22.2714, 114.1499, 'seed'),
 ('铜锣湾时代广场', '香港', '香港铜锣湾勿地臣街 1 号时代广场', 22.2783, 114.1822, 'seed'),
 ('尖沙咀海滨长廊与星光大道', '香港', '香港尖沙咀海滨长廊 / 星光大道', 22.293, 114.174, 'seed'),
 ('港珠澳大桥珠海公路口岸', '珠海', '珠海市香洲区港珠澳大桥珠海公路口岸', 22.2216, 113.558, 'seed'),
 ('大英博物馆', '伦敦', '伦敦大罗素街大英博物馆（Great Russell St, WC1B 3DG）', 51.5194, -0.127, 'seed'),
 ('考文特花园', '伦敦', '伦敦考文特花园市集（Covent Garden, WC2E 8RF）', 51.512, -0.122, 'seed'),
 ('国家美术馆与特拉法加广场', '伦敦', '伦敦特拉法加广场国家美术馆（WC2N 5DN）', 51.5089, -0.1283, 'seed'),
 ('博罗市场午餐', '伦敦', '伦敦南华克街 8 号博罗市场（8 Southwark St, SE1 1TL）', 51.5055, -0.091, 'seed'),
 ('伦敦塔与塔桥', '伦敦', '伦敦塔桥路伦敦塔（Tower Bridge Rd, SE1 2UP）', 51.5081, -0.0759, 'seed'),
 ('泰晤士河游船（塔桥 → 威斯敏斯特）', '伦敦', '伦敦塔桥千禧码头（Tower Millennium Pier, SE1 2UP）', 51.5053, -0.0753, 'seed'),
 ('伦敦眼与南岸夜景', '伦敦', '伦敦南岸郡政厅伦敦眼（County Hall, SE1 7PB）', 51.5033, -0.1196, 'seed');
