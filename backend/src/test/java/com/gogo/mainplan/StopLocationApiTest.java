package com.gogo.mainplan;

import com.gogo.auth.TestAuth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

// US-079 路线1：生成落库时从 place_cache 补地址/坐标；stop-locations 回写程序查的
// 坐标并沉淀缓存；确认投影把坐标抄进 plan_node。存量 MainPlanApiTest 不改动。
@SpringBootTest(classes = com.gogo.hello.HelloApplication.class, properties = {
        "spring.datasource.url=jdbc:sqlite:file:stop-location-test?mode=memory&cache=shared",
        "spring.datasource.hikari.maximum-pool-size=1"
})
@AutoConfigureMockMvc
class StopLocationApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private long tripId;

    @BeforeEach
    void resetFixtureState() {
        tripId = jdbcTemplate.queryForObject(
                "SELECT MIN(id) FROM trip WHERE name = 'Singapore Friends Day'", Long.class);
        jdbcTemplate.update("DELETE FROM main_plan_stop WHERE draft_id IN "
                + "(SELECT id FROM main_plan_draft WHERE trip_id = ?)", tripId);
        jdbcTemplate.update("DELETE FROM main_plan_draft WHERE trip_id = ?", tripId);
        jdbcTemplate.update("DELETE FROM plan_node WHERE trip_id = ? AND branch_id = 'main'", tripId);
        jdbcTemplate.update("UPDATE trip_member SET ready = 1, preference_revision = 1 "
                + "WHERE trip_id = ? AND user_id IN (1, 2, 3, 4)", tripId);
        jdbcTemplate.update("DELETE FROM member_preference WHERE trip_id = ? AND kind IN ('budget', 'submission')",
                tripId);
        jdbcTemplate.update("UPDATE trip SET start_location = 'City Hall MRT', "
                + "end_location = 'Merlion Park', main_plan_confirmed = 0 WHERE id = ?", tripId);
        // 回写会把种子行升级为 geocode，故每例全清后重插种子，保证用例隔离。
        jdbcTemplate.update("DELETE FROM place_cache");
        reseedPlaceCache();
    }

    private void reseedPlaceCache() {
        jdbcTemplate.update("INSERT OR IGNORE INTO place_cache (name, city, address, lat, lng, source) VALUES "
                + "('City Hall MRT', 'Singapore', '150 North Bridge Rd, Singapore 179100', 1.2931, 103.852, 'seed'), "
                + "('National Gallery Singapore', 'Singapore', '1 St Andrew''s Rd, Singapore 179097', 1.2902, 103.8515, 'seed'), "
                + "('Gardens by the Bay', 'Singapore', '18 Marina Gardens Dr, Singapore 018953', 1.2816, 103.8636, 'seed'), "
                + "('Merlion Park', 'Singapore', '1 Fullerton Rd, Singapore 049213', 1.2868, 103.8545, 'seed'), "
                + "('西九文化区 M+ 博物馆', '香港', '香港西九文化区博物馆道 38 号 M+ 博物馆', 22.3009, 114.1595, 'seed'), "
                + "('天星小轮（尖沙咀 → 中环）', '香港', '香港尖沙咀天星码头（乘船往中环天星码头）', 22.2936, 114.1696, 'seed'), "
                + "('中环街市与半山扶梯', '香港', '香港中环皇后大道中 93 号中环街市 / 中环半山扶梯', 22.2837, 114.1555, 'seed'), "
                + "('中环至半山自动扶梯', '香港', '香港中环皇后大道中 93 号中环街市 / 中环半山扶梯', 22.2836, 114.1552, 'seed'), "
                + "('太平山顶与凌霄阁', '香港', '香港山顶山顶道 128 号凌霄阁', 22.2714, 114.1499, 'seed'), "
                + "('铜锣湾时代广场', '香港', '香港铜锣湾勿地臣街 1 号时代广场', 22.2783, 114.1822, 'seed'), "
                + "('尖沙咀海滨长廊与星光大道', '香港', '香港尖沙咀海滨长廊 / 星光大道', 22.293, 114.174, 'seed'), "
                + "('港珠澳大桥珠海公路口岸', '珠海', '珠海市香洲区港珠澳大桥珠海公路口岸', 22.2216, 113.558, 'seed'), "
                + "('大英博物馆', '伦敦', '伦敦大罗素街大英博物馆（Great Russell St, WC1B 3DG）', 51.5194, -0.127, 'seed'), "
                + "('考文特花园', '伦敦', '伦敦考文特花园市集（Covent Garden, WC2E 8RF）', 51.512, -0.122, 'seed'), "
                + "('国家美术馆与特拉法加广场', '伦敦', '伦敦特拉法加广场国家美术馆（WC2N 5DN）', 51.5089, -0.1283, 'seed'), "
                + "('博罗市场午餐', '伦敦', '伦敦南华克街 8 号博罗市场（8 Southwark St, SE1 1TL）', 51.5055, -0.091, 'seed'), "
                + "('伦敦塔与塔桥', '伦敦', '伦敦塔桥路伦敦塔（Tower Bridge Rd, SE1 2UP）', 51.5081, -0.0759, 'seed'), "
                + "('泰晤士河游船（塔桥 → 威斯敏斯特）', '伦敦', '伦敦塔桥千禧码头（Tower Millennium Pier, SE1 2UP）', 51.5053, -0.0753, 'seed'), "
                + "('伦敦眼与南岸夜景', '伦敦', '伦敦南岸郡政厅伦敦眼（County Hall, SE1 7PB）', 51.5033, -0.1196, 'seed')");
    }

    private MockHttpServletRequestBuilder withIdentity(MockHttpServletRequestBuilder request, String userId) {
        return request.with(TestAuth.asUser(userId));
    }

    private JsonNode generateOk() throws Exception {
        MvcResult result = mockMvc.perform(withIdentity(post("/api/trips/" + tripId + "/main-plan"), "1"))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private MvcResult writeLocations(String userId, String body) throws Exception {
        return mockMvc.perform(withIdentity(post("/api/trips/" + tripId + "/main-plan/stop-locations"), userId)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
    }

    @Test
    void generateCompletesAddressAndCoordsFromSeedCache() throws Exception {
        JsonNode plan = generateOk();
        JsonNode first = plan.path("stops").get(0);
        assertEquals("City Hall MRT", first.path("name").asText());
        assertEquals("150 North Bridge Rd, Singapore 179100", first.path("address").asText());
        assertEquals(1.2931, first.path("lat").asDouble(), 1e-6);
        assertEquals(103.852, first.path("lng").asDouble(), 1e-6);
    }

    @Test
    void readPlanCarriesThePersistedLocationFields() throws Exception {
        generateOk();
        mockMvc.perform(withIdentity(get("/api/trips/" + tripId + "/main-plan"), "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stops[0].address").value("150 North Bridge Rd, Singapore 179100"))
                .andExpect(jsonPath("$.stops[0].lat").value(1.2931))
                .andExpect(jsonPath("$.stops[3].name").value("Merlion Park"));
    }

    @Test
    void writeBackPersistsCoordsAndSedimentsCache() throws Exception {
        generateOk();
        MvcResult result = writeLocations("1", "{\"stops\":[{\"seq\":1,\"lat\":1.3,\"lng\":103.86}]}");
        assertEquals(200, result.getResponse().getStatus());
        JsonNode plan = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(1.3, plan.path("stops").get(0).path("lat").asDouble(), 1e-6);
        String source = jdbcTemplate.queryForObject(
                "SELECT source FROM place_cache WHERE name = 'City Hall MRT' AND city = 'Singapore'",
                String.class);
        assertEquals("geocode", source);
    }

    @Test
    void writeBackPersistsRealAddressIntoStopAndCache() throws Exception {
        generateOk();
        MvcResult result = writeLocations("1",
                "{\"stops\":[{\"seq\":1,\"lat\":1.3,\"lng\":103.86,\"address\":\" 150 North Bridge Rd, Singapore 179100 \"}]}");
        assertEquals(200, result.getResponse().getStatus());
        JsonNode plan = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals("150 North Bridge Rd, Singapore 179100", plan.path("stops").get(0).path("address").asText());
        String cached = jdbcTemplate.queryForObject(
                "SELECT address FROM place_cache WHERE name = 'City Hall MRT' AND city = 'Singapore'",
                String.class);
        assertEquals("150 North Bridge Rd, Singapore 179100", cached);
    }

    @Test
    void writeBackWithoutAddressKeepsExistingAddress() throws Exception {
        generateOk();
        MvcResult result = writeLocations("1", "{\"stops\":[{\"seq\":1,\"lat\":1.3,\"lng\":103.86}]}");
        assertEquals(200, result.getResponse().getStatus());
        String address = jdbcTemplate.queryForObject(
                "SELECT address FROM main_plan_stop WHERE draft_id = "
                        + "(SELECT id FROM main_plan_draft WHERE trip_id = ? AND status = 'current') AND seq = 1",
                String.class, tripId);
        assertEquals("150 North Bridge Rd, Singapore 179100", address);
    }

    @Test
    void unknownSeqIsRejected() throws Exception {
        generateOk();
        MvcResult result = writeLocations("1", "{\"stops\":[{\"seq\":99,\"lat\":1.3,\"lng\":103.86}]}");
        assertEquals(422, result.getResponse().getStatus());
        assertEquals("UNKNOWN_STOP", objectMapper.readTree(result.getResponse().getContentAsString())
                .path("code").asText());
    }

    @Test
    void outOfRangeCoordsAreRejected() throws Exception {
        generateOk();
        MvcResult result = writeLocations("1", "{\"stops\":[{\"seq\":1,\"lat\":91,\"lng\":103.86}]}");
        assertEquals(422, result.getResponse().getStatus());
        assertEquals("INVALID_COORDS", objectMapper.readTree(result.getResponse().getContentAsString())
                .path("code").asText());
    }

    @Test
    void nonOrganizerCannotWriteLocations() throws Exception {
        generateOk();
        MvcResult result = writeLocations("2", "{\"stops\":[{\"seq\":1,\"lat\":1.3,\"lng\":103.86}]}");
        assertEquals(403, result.getResponse().getStatus());
    }

    @Test
    void writeWithoutDraftIs404() throws Exception {
        MvcResult result = writeLocations("1", "{\"stops\":[{\"seq\":1,\"lat\":1.3,\"lng\":103.86}]}");
        assertEquals(404, result.getResponse().getStatus());
    }

    @Test
    void confirmProjectsCoordsIntoPlanNode() throws Exception {
        generateOk();
        writeLocations("1", "{\"stops\":[{\"seq\":1,\"lat\":1.3,\"lng\":103.86}]}");
        mockMvc.perform(withIdentity(post("/api/trips/" + tripId + "/main-plan/confirm"), "1"))
                .andExpect(status().isOk());
        Double lat = jdbcTemplate.queryForObject(
                "SELECT lat FROM plan_node WHERE trip_id = ? AND branch_id = 'main' AND sort_order = 1",
                Double.class, tripId);
        assertNotNull(lat);
        assertEquals(1.3, lat, 1e-6);
    }

    @Test
    void cacheMissLeavesCoordsNullAndKeepsProviderAddress() throws Exception {
        jdbcTemplate.update("DELETE FROM place_cache WHERE name = 'City Hall MRT'");
        JsonNode plan = generateOk();
        JsonNode first = plan.path("stops").get(0);
        org.junit.jupiter.api.Assertions.assertTrue(
                first.path("lat").isMissingNode() || first.path("lat").isNull(),
                "cache miss must leave lat null");
        org.junit.jupiter.api.Assertions.assertTrue(
                first.path("lng").isMissingNode() || first.path("lng").isNull(),
                "cache miss must leave lng null");
        assertEquals("150 North Bridge Rd, Singapore 179100", first.path("address").asText());
    }

    @Test
    void sedimentedCacheReusedByLaterTrip() throws Exception {
        generateOk();
        writeLocations("1", "{\"stops\":[{\"seq\":1,\"lat\":1.3,\"lng\":103.86}]}");
        jdbcTemplate.update(
                "INSERT INTO trip (name, destination, start_date, end_date, organizer_id) "
                        + "VALUES ('Cache reuse trip', 'Singapore', '2026-12-05', '2026-12-05', 1)");
        long trip2 = jdbcTemplate.queryForObject("SELECT MAX(id) FROM trip", Long.class);
        jdbcTemplate.update(
                "INSERT INTO trip_member (trip_id, user_id, ready, preference_revision) VALUES (?,1,1,1),(?,2,1,1)",
                trip2, trip2);
        MvcResult result = mockMvc.perform(withIdentity(post("/api/trips/" + trip2 + "/main-plan"), "1"))
                .andExpect(status().isCreated()).andReturn();
        JsonNode plan = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(1.3, plan.path("stops").get(0).path("lat").asDouble(), 1e-6);
        assertEquals(103.86, plan.path("stops").get(0).path("lng").asDouble(), 1e-6);
    }
}
