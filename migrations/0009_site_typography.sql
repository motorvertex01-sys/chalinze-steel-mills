UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.theme.bodyFontSize',
      CASE WHEN json_type(published_json, '$.theme.bodyFontSize') IS NULL
        THEN 15 ELSE json_extract(published_json, '$.theme.bodyFontSize') END
    ),
    draft_json = json_set(
      draft_json,
      '$.theme.bodyFontSize',
      CASE WHEN json_type(draft_json, '$.theme.bodyFontSize') IS NULL
        THEN 15 ELSE json_extract(draft_json, '$.theme.bodyFontSize') END
    )
WHERE content_key = 'site-config'
  AND (
    json_type(published_json, '$.theme.bodyFontSize') IS NULL
    OR json_type(draft_json, '$.theme.bodyFontSize') IS NULL
  );
