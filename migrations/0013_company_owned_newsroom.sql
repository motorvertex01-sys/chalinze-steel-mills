UPDATE site_content
SET published_json = CASE
      WHEN json_extract(published_json, '$.pages."/news".summary') = 'The company document defines a proposed communications programme; current announcements and media assets require authorized company publication.'
      THEN json_set(
        published_json,
        '$.pages."/news".eyebrow', 'Company newsroom',
        '$.pages."/news".summary', 'Company announcements, project updates and approved company-owned media in one place. News is published only after verification and authorization.'
      )
      ELSE published_json
    END,
    draft_json = CASE
      WHEN json_extract(draft_json, '$.pages."/news".summary') = 'The company document defines a proposed communications programme; current announcements and media assets require authorized company publication.'
      THEN json_set(
        draft_json,
        '$.pages."/news".eyebrow', 'Company newsroom',
        '$.pages."/news".summary', 'Company announcements, project updates and approved company-owned media in one place. News is published only after verification and authorization.'
      )
      ELSE draft_json
    END
WHERE content_key = 'site-config';

UPDATE site_content
SET published_json = json_set(published_json, '$.items', json('[]'))
WHERE content_key = 'news-media'
  AND json_array_length(published_json, '$.items') = 4
  AND (
    SELECT COUNT(DISTINCT json_extract(item.value, '$.id'))
    FROM json_each(published_json, '$.items') AS item
  ) = 4
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(published_json, '$.items') AS item
    WHERE json_extract(item.value, '$.id') NOT IN (
      'news-corporate-news', 'news-project-progress', 'news-events-media', 'news-editorial-governance'
    )
      OR (
        json_extract(item.value, '$.id') = 'news-corporate-news'
        AND (
          json_extract(item.value, '$.title') != 'Corporate news & press releases'
          OR json_extract(item.value, '$.category') != 'No approved articles supplied'
          OR json_extract(item.value, '$.description') != 'Corporate announcements, press releases and executive communications are identified as future publishing categories. No articles, issue dates or quotations have been invented.'
          OR json_extract(item.value, '$.sortOrder') != 0
        )
      )
      OR (
        json_extract(item.value, '$.id') = 'news-project-progress'
        AND (
          json_extract(item.value, '$.title') != 'Project progress'
          OR json_extract(item.value, '$.category') != 'Progress evidence required'
          OR json_extract(item.value, '$.description') != 'The document calls for project updates but does not provide verified construction percentages, milestones, commissioning dates or operating results.'
          OR json_extract(item.value, '$.sortOrder') != 10
        )
      )
      OR (
        json_extract(item.value, '$.id') = 'news-events-media'
        AND (
          json_extract(item.value, '$.title') != 'Events & media centre'
          OR json_extract(item.value, '$.category') != 'Media assets pending'
          OR json_extract(item.value, '$.description') != 'Events, conferences, approved photography/video, media requests and corporate publications are identified as communications topics. No press kit or event schedule was supplied.'
          OR json_extract(item.value, '$.sortOrder') != 20
        )
      )
      OR (
        json_extract(item.value, '$.id') = 'news-editorial-governance'
        AND (
          json_extract(item.value, '$.title') != 'Editorial governance'
          OR json_extract(item.value, '$.category') != 'Company communications'
          OR json_extract(item.value, '$.description') != 'Company announcements and events are published only after authorized review against current company information.'
          OR json_extract(item.value, '$.sortOrder') != 30
        )
      )
      OR json_extract(item.value, '$.publishedAt') != ''
      OR json_extract(item.value, '$.mediaType') != ''
      OR json_extract(item.value, '$.mediaUrl') != ''
      OR json_extract(item.value, '$.alt') != ''
  );

UPDATE site_content
SET draft_json = json_set(draft_json, '$.items', json('[]'))
WHERE content_key = 'news-media'
  AND json_array_length(draft_json, '$.items') = 4
  AND (
    SELECT COUNT(DISTINCT json_extract(item.value, '$.id'))
    FROM json_each(draft_json, '$.items') AS item
  ) = 4
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(draft_json, '$.items') AS item
    WHERE json_extract(item.value, '$.id') NOT IN (
      'news-corporate-news', 'news-project-progress', 'news-events-media', 'news-editorial-governance'
    )
      OR (
        json_extract(item.value, '$.id') = 'news-corporate-news'
        AND (
          json_extract(item.value, '$.title') != 'Corporate news & press releases'
          OR json_extract(item.value, '$.category') != 'No approved articles supplied'
          OR json_extract(item.value, '$.description') != 'Corporate announcements, press releases and executive communications are identified as future publishing categories. No articles, issue dates or quotations have been invented.'
          OR json_extract(item.value, '$.sortOrder') != 0
        )
      )
      OR (
        json_extract(item.value, '$.id') = 'news-project-progress'
        AND (
          json_extract(item.value, '$.title') != 'Project progress'
          OR json_extract(item.value, '$.category') != 'Progress evidence required'
          OR json_extract(item.value, '$.description') != 'The document calls for project updates but does not provide verified construction percentages, milestones, commissioning dates or operating results.'
          OR json_extract(item.value, '$.sortOrder') != 10
        )
      )
      OR (
        json_extract(item.value, '$.id') = 'news-events-media'
        AND (
          json_extract(item.value, '$.title') != 'Events & media centre'
          OR json_extract(item.value, '$.category') != 'Media assets pending'
          OR json_extract(item.value, '$.description') != 'Events, conferences, approved photography/video, media requests and corporate publications are identified as communications topics. No press kit or event schedule was supplied.'
          OR json_extract(item.value, '$.sortOrder') != 20
        )
      )
      OR (
        json_extract(item.value, '$.id') = 'news-editorial-governance'
        AND (
          json_extract(item.value, '$.title') != 'Editorial governance'
          OR json_extract(item.value, '$.category') != 'Company communications'
          OR json_extract(item.value, '$.description') != 'Company announcements and events are published only after authorized review against current company information.'
          OR json_extract(item.value, '$.sortOrder') != 30
        )
      )
      OR json_extract(item.value, '$.publishedAt') != ''
      OR json_extract(item.value, '$.mediaType') != ''
      OR json_extract(item.value, '$.mediaUrl') != ''
      OR json_extract(item.value, '$.alt') != ''
  );
