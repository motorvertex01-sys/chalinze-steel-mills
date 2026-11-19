UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.theme.accent',
      CASE lower(json_extract(published_json, '$.theme.accent'))
        WHEN '#e86f1e' THEN '#C69A45'
        ELSE COALESCE(json_extract(published_json, '$.theme.accent'), '#C69A45')
      END,
      '$.theme.background',
      CASE lower(json_extract(published_json, '$.theme.background'))
        WHEN '#f7f8f8' THEN '#F3F5F7'
        ELSE COALESCE(json_extract(published_json, '$.theme.background'), '#F3F5F7')
      END,
      '$.header.lightBackground',
      CASE lower(json_extract(published_json, '$.header.lightBackground'))
        WHEN '#080a0c' THEN '#172B40'
        ELSE COALESCE(json_extract(published_json, '$.header.lightBackground'), '#172B40')
      END,
      '$.header.lightText',
      CASE lower(json_extract(published_json, '$.header.lightText'))
        WHEN '#f3f4f2' THEN '#F3F5F7'
        ELSE COALESCE(json_extract(published_json, '$.header.lightText'), '#F3F5F7')
      END,
      '$.header.darkBackground',
      CASE lower(json_extract(published_json, '$.header.darkBackground'))
        WHEN '#ffffff' THEN '#F3F5F7'
        ELSE COALESCE(json_extract(published_json, '$.header.darkBackground'), '#F3F5F7')
      END,
      '$.header.darkText',
      CASE lower(json_extract(published_json, '$.header.darkText'))
        WHEN '#172126' THEN '#172B40'
        ELSE COALESCE(json_extract(published_json, '$.header.darkText'), '#172B40')
      END
    ),
    draft_json = json_set(
      draft_json,
      '$.theme.accent',
      CASE lower(json_extract(draft_json, '$.theme.accent'))
        WHEN '#e86f1e' THEN '#C69A45'
        ELSE COALESCE(json_extract(draft_json, '$.theme.accent'), '#C69A45')
      END,
      '$.theme.background',
      CASE lower(json_extract(draft_json, '$.theme.background'))
        WHEN '#f7f8f8' THEN '#F3F5F7'
        ELSE COALESCE(json_extract(draft_json, '$.theme.background'), '#F3F5F7')
      END,
      '$.header.lightBackground',
      CASE lower(json_extract(draft_json, '$.header.lightBackground'))
        WHEN '#080a0c' THEN '#172B40'
        ELSE COALESCE(json_extract(draft_json, '$.header.lightBackground'), '#172B40')
      END,
      '$.header.lightText',
      CASE lower(json_extract(draft_json, '$.header.lightText'))
        WHEN '#f3f4f2' THEN '#F3F5F7'
        ELSE COALESCE(json_extract(draft_json, '$.header.lightText'), '#F3F5F7')
      END,
      '$.header.darkBackground',
      CASE lower(json_extract(draft_json, '$.header.darkBackground'))
        WHEN '#ffffff' THEN '#F3F5F7'
        ELSE COALESCE(json_extract(draft_json, '$.header.darkBackground'), '#F3F5F7')
      END,
      '$.header.darkText',
      CASE lower(json_extract(draft_json, '$.header.darkText'))
        WHEN '#172126' THEN '#172B40'
        ELSE COALESCE(json_extract(draft_json, '$.header.darkText'), '#172B40')
      END
    )
WHERE content_key = 'site-config';
