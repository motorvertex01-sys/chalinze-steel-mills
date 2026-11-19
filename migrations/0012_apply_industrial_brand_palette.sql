UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.theme.accent', '#C69A45',
      '$.theme.background', '#F3F5F7',
      '$.theme.panel', '#FFFFFF',
      '$.header.lightBackground', '#172B40',
      '$.header.lightText', '#F3F5F7',
      '$.header.darkBackground', '#F3F5F7',
      '$.header.darkText', '#172B40'
    ),
    draft_json = json_set(
      draft_json,
      '$.theme.accent', '#C69A45',
      '$.theme.background', '#F3F5F7',
      '$.theme.panel', '#FFFFFF',
      '$.header.lightBackground', '#172B40',
      '$.header.lightText', '#F3F5F7',
      '$.header.darkBackground', '#F3F5F7',
      '$.header.darkText', '#172B40'
    )
WHERE content_key = 'site-config';
