UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.theme.accent', '#e86f1e',
      '$.theme.background', '#f7f8f8',
      '$.theme.panel', '#ffffff',
      '$.theme.bodyFont', 'Inter',
      '$.home.heroDescription', 'Chalinze Steel Mills Ltd is a Tanzanian registered company developing a proposed integrated iron ore mining, beneficiation and steel manufacturing project at Vigwaza, Pwani Region.',
      '$.home.introPrimary', 'Chalinze Steel Mills Ltd is a Tanzanian registered company focused on developing an integrated iron ore mining, beneficiation and steel manufacturing operation, transforming run-of-mine iron ore into high-quality steel billets.',
      '$.footer.tagline', 'Tanzanian-registered company developing an integrated iron ore, beneficiation and steel billet project.'
    ),
    draft_json = json_set(
      draft_json,
      '$.theme.accent', '#e86f1e',
      '$.theme.background', '#f7f8f8',
      '$.theme.panel', '#ffffff',
      '$.theme.bodyFont', 'Inter',
      '$.home.heroDescription', 'Chalinze Steel Mills Ltd is a Tanzanian registered company developing a proposed integrated iron ore mining, beneficiation and steel manufacturing project at Vigwaza, Pwani Region.',
      '$.home.introPrimary', 'Chalinze Steel Mills Ltd is a Tanzanian registered company focused on developing an integrated iron ore mining, beneficiation and steel manufacturing operation, transforming run-of-mine iron ore into high-quality steel billets.',
      '$.footer.tagline', 'Tanzanian-registered company developing an integrated iron ore, beneficiation and steel billet project.'
    )
WHERE content_key = 'site-config';

UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.pages."/company".title', 'The company behind the steel.',
      '$.pages."/company".summary', 'Chalinze Steel Mills Ltd is a Tanzanian registered company focused on developing an integrated iron ore mining, beneficiation and steel manufacturing operation, transforming run-of-mine iron ore into high-quality steel billets.',
      '$.pages."/company".sections', json('[{"title":"Who we are","body":"Chalinze Steel Mills Ltd is a Tanzanian registered company focused on developing an integrated iron ore mining, beneficiation and steel manufacturing operation, transforming run-of-mine iron ore into high-quality steel billets.","tag":"Company overview"},{"title":"Ownership & group relationship","body":"Chalinze Steel Mills Ltd is a wholly owned subsidiary of GYPSUM Plus Mines Ltd.","tag":"Group structure"},{"title":"Our vision","body":"To establish a competitive, efficient and sustainable steel business serving Tanzania and regional markets.","tag":"Vision"},{"title":"Our mission","body":"To develop an integrated operation through modern technology, skills development, strategic partnership and responsible practice.","tag":"Mission"},{"title":"Strategic priorities","body":"Local value creation, regional market development, technology transfer, employment and skills development, and responsible industrial growth.","tag":"Corporate priorities"},{"title":"Business philosophy","body":"Integration across the value chain, technical discipline in design and execution, and commercial competitiveness guide the project approach.","tag":"Integration · discipline · competitiveness"},{"title":"Strategic cooperation & responsible development","body":"The company’s approach emphasizes cooperation with investors, technology providers, customers and development partners, alongside responsible environmental, social, safety and governance planning.","tag":"Partnership · responsibility"},{"title":"Governance & leadership","body":"The Board of Directors, Senior Management Team and Supporting Staff are presented in the Leadership & Governance section.","tag":"Company structure"}]')
    ),
    draft_json = json_set(
      draft_json,
      '$.pages."/company".title', 'The company behind the steel.',
      '$.pages."/company".summary', 'Chalinze Steel Mills Ltd is a Tanzanian registered company focused on developing an integrated iron ore mining, beneficiation and steel manufacturing operation, transforming run-of-mine iron ore into high-quality steel billets.',
      '$.pages."/company".sections', json('[{"title":"Who we are","body":"Chalinze Steel Mills Ltd is a Tanzanian registered company focused on developing an integrated iron ore mining, beneficiation and steel manufacturing operation, transforming run-of-mine iron ore into high-quality steel billets.","tag":"Company overview"},{"title":"Ownership & group relationship","body":"Chalinze Steel Mills Ltd is a wholly owned subsidiary of GYPSUM Plus Mines Ltd.","tag":"Group structure"},{"title":"Our vision","body":"To establish a competitive, efficient and sustainable steel business serving Tanzania and regional markets.","tag":"Vision"},{"title":"Our mission","body":"To develop an integrated operation through modern technology, skills development, strategic partnership and responsible practice.","tag":"Mission"},{"title":"Strategic priorities","body":"Local value creation, regional market development, technology transfer, employment and skills development, and responsible industrial growth.","tag":"Corporate priorities"},{"title":"Business philosophy","body":"Integration across the value chain, technical discipline in design and execution, and commercial competitiveness guide the project approach.","tag":"Integration · discipline · competitiveness"},{"title":"Strategic cooperation & responsible development","body":"The company’s approach emphasizes cooperation with investors, technology providers, customers and development partners, alongside responsible environmental, social, safety and governance planning.","tag":"Partnership · responsibility"},{"title":"Governance & leadership","body":"The Board of Directors, Senior Management Team and Supporting Staff are presented in the Leadership & Governance section.","tag":"Company structure"}]')
    )
WHERE content_key = 'site-config'
  AND json_extract(published_json, '$.pages."/company".title') = 'The company behind the name.';

UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.pages."/products".title', 'Steel billets & material applications.',
      '$.pages."/products".summary', 'Steel billets are the principal planned product of the proposed integrated value chain. Two nominal cross-sections are listed; final specifications remain to be confirmed.',
      '$.pages."/products".sections', json('[{"title":"130 × 130 mm billet","body":"A planned billet cross-section. Billet length, steel grade, chemistry, tolerances and mechanical properties remain to be confirmed.","tag":"Planned nominal cross-section"},{"title":"150 × 150 mm billet","body":"A second planned billet cross-section. Confirm dimensions against the approved product specification before commercial use.","tag":"Planned nominal cross-section"},{"title":"Downstream uses","body":"Steel billets are semi-finished feedstock for downstream steel processing, including reinforcement and structural products. These are potential applications, not direct Chalinze products.","tag":"Downstream application only"},{"title":"Technical data & availability","body":"Approved grade, chemistry, mechanical properties, tolerances, length, pricing, stock, lead times and product certificates have not yet been published.","tag":"Specifications pending"},{"title":"Quality You Can Trust","body":"The proposed quality framework covers raw-material verification, process monitoring, metallurgical analysis and final billet inspection. Testing methods, operating records and product specifications remain subject to engineering development.","tag":"Planned quality framework"}]')
    ),
    draft_json = json_set(
      draft_json,
      '$.pages."/products".title', 'Steel billets & material applications.',
      '$.pages."/products".summary', 'Steel billets are the principal planned product of the proposed integrated value chain. Two nominal cross-sections are listed; final specifications remain to be confirmed.',
      '$.pages."/products".sections', json('[{"title":"130 × 130 mm billet","body":"A planned billet cross-section. Billet length, steel grade, chemistry, tolerances and mechanical properties remain to be confirmed.","tag":"Planned nominal cross-section"},{"title":"150 × 150 mm billet","body":"A second planned billet cross-section. Confirm dimensions against the approved product specification before commercial use.","tag":"Planned nominal cross-section"},{"title":"Downstream uses","body":"Steel billets are semi-finished feedstock for downstream steel processing, including reinforcement and structural products. These are potential applications, not direct Chalinze products.","tag":"Downstream application only"},{"title":"Technical data & availability","body":"Approved grade, chemistry, mechanical properties, tolerances, length, pricing, stock, lead times and product certificates have not yet been published.","tag":"Specifications pending"},{"title":"Quality You Can Trust","body":"The proposed quality framework covers raw-material verification, process monitoring, metallurgical analysis and final billet inspection. Testing methods, operating records and product specifications remain subject to engineering development.","tag":"Planned quality framework"}]')
    )
WHERE content_key = 'site-config'
  AND json_extract(published_json, '$.pages."/products".title') = 'Steel, shaped with intent.';

UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.pages."/sustainability".title', 'Responsible development and energy management.',
      '$.pages."/sustainability".summary', 'The project’s sustainability approach addresses energy, carbon, resources, environmental management, safety and community engagement.',
      '$.pages."/sustainability".sections[1].title', 'Energy management & carbon reduction',
      '$.pages."/sustainability".sections[1].body', 'Energy efficiency, responsible energy management and CO₂ reduction are integral to the proposed operating strategy. The planned energy system combines Julius Nyerere Hydropower Project (JNHPP) renewable electricity with natural gas, supported by energy-efficient technologies, waste heat recovery and continuous monitoring of energy consumption. The project will establish measurable energy-intensity and greenhouse-gas emissions indicators to guide operational performance, improve efficiency and support long-term carbon-management objectives.',
      '$.pages."/sustainability".sections[1].tag', 'Proposed strategy · not an operating result'
    ),
    draft_json = json_set(
      draft_json,
      '$.pages."/sustainability".title', 'Responsible development and energy management.',
      '$.pages."/sustainability".summary', 'The project’s sustainability approach addresses energy, carbon, resources, environmental management, safety and community engagement.',
      '$.pages."/sustainability".sections[1].title', 'Energy management & carbon reduction',
      '$.pages."/sustainability".sections[1].body', 'Energy efficiency, responsible energy management and CO₂ reduction are integral to the proposed operating strategy. The planned energy system combines Julius Nyerere Hydropower Project (JNHPP) renewable electricity with natural gas, supported by energy-efficient technologies, waste heat recovery and continuous monitoring of energy consumption. The project will establish measurable energy-intensity and greenhouse-gas emissions indicators to guide operational performance, improve efficiency and support long-term carbon-management objectives.',
      '$.pages."/sustainability".sections[1].tag', 'Proposed strategy · not an operating result'
    )
WHERE content_key = 'site-config'
  AND json_extract(published_json, '$.pages."/sustainability".title') = 'Progress, responsibly made.';

UPDATE site_content
SET published_json = json_set(
      published_json,
      '$.pages."/contact".sections[2].body', 'CEO/corporate email: ceo@chalinzesteelmills.co.tz. Current website: chalinze-steel-mills.motorvertex01.workers.dev.',
      '$.pages."/contact".sections[2].tag', 'Corporate contact'
    ),
    draft_json = json_set(
      draft_json,
      '$.pages."/contact".sections[2].body', 'CEO/corporate email: ceo@chalinzesteelmills.co.tz. Current website: chalinze-steel-mills.motorvertex01.workers.dev.',
      '$.pages."/contact".sections[2].tag', 'Corporate contact'
    )
WHERE content_key = 'site-config'
  AND json_extract(published_json, '$.pages."/contact".sections[2].body') LIKE '%chalinzesteelmills.co.tz%';

UPDATE site_content
SET published_json = json_insert(
      published_json,
      (
        SELECT group_item.fullkey || '.links[#]'
        FROM json_each(published_json, '$.navigation') AS group_item
        WHERE json_extract(group_item.value, '$.label') = 'Products & Markets'
        LIMIT 1
      ),
      json('{"label":"Material applications","path":"/products#product-applications"}')
    )
WHERE content_key = 'site-config'
  AND EXISTS (
    SELECT 1
    FROM json_each(published_json, '$.navigation') AS group_item
    WHERE json_extract(group_item.value, '$.label') = 'Products & Markets'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(published_json, '$.navigation') AS group_item,
         json_each(group_item.value, '$.links') AS link_item
    WHERE json_extract(group_item.value, '$.label') = 'Products & Markets'
      AND json_extract(link_item.value, '$.path') = '/products#product-applications'
  );

UPDATE site_content
SET draft_json = json_insert(
      draft_json,
      (
        SELECT group_item.fullkey || '.links[#]'
        FROM json_each(draft_json, '$.navigation') AS group_item
        WHERE json_extract(group_item.value, '$.label') = 'Products & Markets'
        LIMIT 1
      ),
      json('{"label":"Material applications","path":"/products#product-applications"}')
    )
WHERE content_key = 'site-config'
  AND EXISTS (
    SELECT 1
    FROM json_each(draft_json, '$.navigation') AS group_item
    WHERE json_extract(group_item.value, '$.label') = 'Products & Markets'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM json_each(draft_json, '$.navigation') AS group_item,
         json_each(group_item.value, '$.links') AS link_item
    WHERE json_extract(group_item.value, '$.label') = 'Products & Markets'
      AND json_extract(link_item.value, '$.path') = '/products#product-applications'
  );
