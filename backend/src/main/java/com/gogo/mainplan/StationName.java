package com.gogo.mainplan;

import java.util.regex.Pattern;

/**
 * AI 生成的站点名经常自带「主线·」前缀，那只是路线展示标记而不是站点名的一部分：站点名归用户所有，
 * 地图导航与「编辑站点」弹窗只应看到真实的活动名（与拆分侧 station-name 规则一致）。落库前统一去掉，
 * 避免前缀进入标题、导航查询与改名输入框。
 */
final class StationName {

    private static final Pattern LEADING_MAINLINE = Pattern.compile("^主线\\s*[·•・:：-]\\s*");

    private StationName() {
    }

    /** 去掉开头的「主线」标记；空名或只有标记时原样返回，不改动其它内容。 */
    static String clean(String name) {
        String value = name == null ? "" : name.trim();
        if (value.isEmpty()) {
            return value;
        }
        String cleaned = LEADING_MAINLINE.matcher(value).replaceFirst("").trim();
        return cleaned.isEmpty() ? value : cleaned;
    }
}
