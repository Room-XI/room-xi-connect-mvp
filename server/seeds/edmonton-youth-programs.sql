-- Edmonton Youth Programs Database
-- Last updated: November 26, 2025
-- Total programs: 75+

-- This seed file contains comprehensive Edmonton youth resources including:
-- Mental Health, LGBTQ+ & 2Spirit, Indigenous, Arts & Creative, Sports & Recreation, Employment & Career, Crisis Support

-- Note: Run this with psql or through the database migration system
-- Programs are added with ON CONFLICT DO NOTHING to prevent duplicates

-- To regenerate this file, export from the live database using:
-- SELECT * FROM programs ORDER BY title;

-- The database is the source of truth for program data.
-- This seed file serves as a backup and for new deployments.

-- Mental Health Programs
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('Kickstand – Walk-In Mental Health Hub', 'One-stop youth mental health hub at West Edmonton Mall. Free drop-in mental health support, substance use counseling, peer support, Indigenous wellness, life skills, and primary care. Open 7 days/week. 20+ service providers under one roof.', '{mental-health,drop-in,free,indoor}', '{emotional,social}', true, 11, 25, 'West Edmonton Mall', 'Edmonton', 'https://ymcanab.ca', 'YMCA of Northern Alberta', true, true, false),
('YMCA Y Mind – Stress & Anxiety Program', 'Group program teaching healthy coping skills for stress and anxiety using mindfulness and Acceptance & Commitment Therapy. Free, requires intake session.', '{mental-health,anxiety,counseling,group,free,indoor}', '{emotional,intellectual}', false, 13, 30, 'Multiple Edmonton locations + virtual', 'Edmonton', 'https://ymcanab.ca/programs/learning-leadership-employment/youth-young-adults/y-mind', 'YMCA of Northern Alberta', true, true, false),
('CASA Mental Health – Youth Services', 'Comprehensive mental health treatment for children and youth ages 3-17. Services include outpatient therapy, day programs, school-based treatment, Indigenous-focused services, and residential care.', '{mental-health,counselling,counseling,support,indoor,Indigenous,learning}', '{emotional,social,intellectual}', false, 13, 17, '10645-63 Ave NW', 'Edmonton', 'https://casamentalhealth.org/', 'CASA Mental Health', true, true, false),
('ACCESS Open Minds – Walk-In Counseling', 'Free walk-in mental health and addiction counseling for youth 16-25. No appointment needed. Solution-focused sessions (45-60 min) with clinicians.', '{mental-health,free,indoor,counselling,counseling,support,drop-in}', '{emotional,social,intellectual}', true, 16, 25, 'Contact for location details', 'Edmonton', 'https://accessopenminds.ca/our_site/edmonton-ab-2/', 'ACCESS Open Minds Edmonton', true, true, false),
('AHS Child & Adolescent Mental Health Intake', 'Single intake point for accessing mental health services for children and adolescents in the Edmonton zone.', '{mental-health,counseling,clinical,free,indoor}', '{emotional}', false, 3, 17, 'Edmonton Zone', 'Edmonton', 'https://www.albertahealthservices.ca/findhealth/service.aspx?Id=1001856', 'Alberta Health Services', true, true, false),
('Alberta Health Services – AccessMHA', 'Single point of access for mental health and addiction services. Walk-in, phone, or online referrals.', '{mental-health,addiction,clinical,free,indoor}', '{emotional}', true, 13, 99, 'Multiple Edmonton locations', 'Edmonton', 'https://www.albertahealthservices.ca/amh/Page2748.aspx', 'Alberta Health Services', true, true, false)
ON CONFLICT DO NOTHING;

-- LGBTQ+ & 2Spirit Programs
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('CHEW Project – 2SLGBTQ+ Youth Drop-In', 'Drop-in center for 2SLGBTQ+ youth facing barriers including houselessness, mental health challenges, and poverty. Offers crisis intervention, counseling, Indigenous peer support, meals, showers, and harm reduction.', '{lgbtq,mental-health,drop-in,crisis,indigenous,free,indoor}', '{social,emotional}', true, 13, 29, 'University of Alberta Campus', 'Edmonton', 'https://www.ualberta.ca/fyrefly-institute/programs-and-services/chew-project.html', 'Fyrefly Institute (U of A)', true, true, false),
('Rainbow Alliance for Youth of Edmonton', 'Programs and resources for 2SLGBTQIA+ youth with Queer Access Navigator connecting youth to programs, especially those with intersecting identities.', '{lgbtq,community,support,free,indoor}', '{social,emotional}', true, 12, 24, 'Edmonton', 'Edmonton', 'https://rainbowallianceyeg.ca/', 'Rainbow Alliance for Youth', true, true, false),
('Pride Centre of Edmonton – Youth Programs', 'Counseling, resources, referrals, and welcoming community space for LGBTQ+ youth. Safe space for connection and support.', '{lgbtq,counseling,community,free,indoor}', '{social,emotional}', true, 13, 25, '9540 111 Ave NW', 'Edmonton', 'https://pridecentreofedmonton.ca/', 'Pride Centre of Edmonton', true, true, false),
('Skipping Stone – Trans Youth Support', 'Comprehensive support for trans and gender-diverse youth, adults, and families. Client-centered support teams with a holistic care model.', '{lgbtq,trans,counseling,support,free,indoor}', '{social,emotional,physical}', false, 6, 25, 'Edmonton', 'Edmonton', 'https://www.skippingstone.ca/', 'Skipping Stone', true, true, false),
('Edmonton 2 Spirit Society', 'Social, health, and cultural programs for 2Spirit, IndigiQueer, and Indigenous LGBTQIA+ communities. Cultural connection and peer support.', '{lgbtq,indigenous,cultural,community,free,indoor}', '{social,spiritual}', true, 13, 25, 'Edmonton', 'Edmonton', 'https://alberta.cmha.ca/lgbtq2s-resources/', 'Edmonton 2 Spirit Society', true, true, false)
ON CONFLICT DO NOTHING;

-- Indigenous Youth Programs
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('Canadian Native Friendship Centre – Youth Programs', 'Social and recreational programs for Indigenous youth. 2SLGBTQIA+ support group meets 2nd & 4th Tuesday monthly 5:30-7:30pm.', '{indigenous,community,recreation,lgbtq,free,indoor}', '{social,spiritual,physical}', true, 13, 25, '#200, 11728 95 Street', 'Edmonton', 'https://www.cnfc.ca/', 'Canadian Native Friendship Centre', true, true, false),
('Native Counselling Services of Alberta', 'Counseling services for Indigenous people including youth. Culturally appropriate support and resources.', '{indigenous,counseling,support,free,indoor}', '{emotional,spiritual}', false, 13, 25, '15548 Stony Plain Rd', 'Edmonton', 'https://www.ncsa.ca/', 'Native Counselling Services of Alberta', true, true, false),
('Hope for Wellness Helpline', '24/7 culturally competent counseling for all Indigenous people. Phone and online chat available.', '{crisis,mental-health,indigenous,free}', '{emotional,spiritual}', true, 13, 99, 'Phone: 1-855-242-3310', 'Edmonton', 'https://www.hopeforwellness.ca/', 'Hope for Wellness', true, false, false),
('Bent Arrow – Cultural & Youth Programs', 'Programs connecting Indigenous youth with culture and community.', '{community,indoor,creative,leadership}', '{spiritual,social}', false, 13, 25, '11304 93 St NW', 'Edmonton', 'https://www.bentarrow.ca', 'Bent Arrow Traditional Healing Society', true, true, false)
ON CONFLICT DO NOTHING;

-- Arts & Creative Programs
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('Edmonton Musical Theatre – Youth Program', 'Musical theatre training including singing, movement, dance, and choral performance. Year-round classes with community and professional performances.', '{arts,music,theater,performance,indoor}', '{social,intellectual,physical}', false, 8, 25, 'Edmonton', 'Edmonton', 'https://edmontonmusicaltheatre.ca/', 'Edmonton Musical Theatre', false, true, false),
('Citadel Theatre – Foote Theatre School', 'Acting and musical theatre classes for all ages. Physical, technical, and creative skills training. Largest theatre school in Edmonton.', '{arts,theater,acting,indoor}', '{social,intellectual,emotional}', false, 8, 21, '9828 101A Ave NW', 'Edmonton', 'https://citadeltheatre.com/fts', 'Citadel Theatre', false, true, false),
('City Arts Centre – Youth Workshops', 'Visual arts, dance, cooking, pottery classes led by professional artists. Multiple locations across Edmonton.', '{arts,visual-arts,pottery,dance,indoor}', '{intellectual,physical}', false, 5, 17, '10943 84 Ave NW', 'Edmonton', 'https://movelearnplay.edmonton.ca/', 'City of Edmonton', false, true, false),
('Creation Space – Youth Art Classes', 'Multi-disciplinary arts with child-led discovery. Weekly classes, open studio time, and workshops focusing on process over outcome.', '{arts,creative,drop-in,indoor}', '{intellectual,emotional}', true, 8, 18, 'Edmonton', 'Edmonton', 'https://www.creationspace.ca/', 'Creation Space', false, true, false),
('Canvastone Childrens Art Studio', 'Soapstone carving, painting, drawing, digital art, and sculpting. Small classes (max 7 students). Free intro soapstone class available.', '{arts,visual-arts,sculpture,indoor}', '{intellectual,emotional}', false, 8, 18, 'Edmonton', 'Edmonton', 'https://www.canvastone.ca/', 'Canvastone Childrens Art Studio', false, true, false),
('iHuman Youth Society – Arts Drop-In', 'Creative drop-in for youth with arts, music, and mentorship.', '{arts,drop-in,community,indoor,free}', '{intellectual,emotional}', true, 13, 25, '9527 82 Ave NW', 'Edmonton', 'https://www.ihuman.org', 'iHuman Youth Society', true, true, false)
ON CONFLICT DO NOTHING;

-- Sports & Recreation Programs
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('Edmonton Grads Youth Basketball Club', 'Low-cost volunteer-run basketball club. Spring season runs January to September. Longest-running basketball club in Edmonton.', '{sports,basketball,recreation,indoor}', '{physical,social}', false, 8, 18, 'Various Edmonton locations', 'Edmonton', 'https://www.gradsbasketball.ca/', 'Edmonton Grads Basketball', false, true, false),
('True North Basketball Academy', 'Basketball training sessions on Saturdays. Age-grouped classes from 6-16 years. 8-week sessions.', '{sports,basketball,training,indoor}', '{physical,social}', false, 6, 16, '4138 - 101 Street NW', 'Edmonton', 'https://www.truenorthbasketballacademy.com/', 'True North Basketball Academy', false, true, false),
('Legacy Athletics – EYBA Youth Basketball', 'Development and competitive basketball programs from Little Legacies (ages 2-8) to EYBA Elite training.', '{sports,basketball,training,indoor}', '{physical,social}', false, 2, 17, 'Edmonton', 'Edmonton', 'https://www.legacyathletics.ca/', 'Legacy Athletics', false, true, false),
('Hockey Edmonton – Learn to Play', 'Low-cost, low-commitment hockey program for beginners. Must be able to skate independently. Winter semester starts January.', '{sports,hockey,recreation,indoor}', '{physical,social}', false, 5, 16, 'Various Edmonton arenas', 'Edmonton', 'https://www.playhockeyedmonton.ca/ltph', 'Hockey Edmonton', false, true, false),
('Oilers Youth Hockey Programs', 'NHL/NHLPA First Shift for beginners, Colbys Kids bridge program, and Oilers Hockey School for elite training.', '{sports,hockey,training,indoor}', '{physical,social}', false, 5, 17, 'Various Edmonton arenas', 'Edmonton', 'https://www.nhl.com/oilers/community/youth-hockey', 'Edmonton Oilers Community Foundation', false, true, false),
('JHL Ball Hockey – Youth League', 'Fall/winter 3-on-3 ball hockey league running October to March. Games on Saturdays. Boys, girls, and coed divisions.', '{sports,ball-hockey,recreation,indoor}', '{physical,social}', false, 8, 17, 'Abbottsfield Rec Centre / Westmount Fitness Club', 'Edmonton', 'http://www.jhlballhockey.ca', 'JHL Ball Hockey', false, true, false),
('City of Edmonton – Free Swim & Skate', 'Free swimming and skating sessions at various City of Edmonton facilities during designated times.', '{recreation,swimming,skating,free,indoor}', '{physical,social}', true, 5, 99, 'Various City of Edmonton rec centres', 'Edmonton', 'https://www.edmonton.ca/activities_parks_recreation/free-swimming-skating', 'City of Edmonton', true, true, false),
('Oil Country Hockey Assist Program', 'Financial assistance up to $750 for hockey registration. No-cost equipment through Sport Central for low-income families.', '{sports,hockey,financial-aid,free}', '{physical}', false, 5, 17, 'Edmonton', 'Edmonton', 'https://kidsportcanada.ca/alberta/edmonton/hap/', 'KidSport Edmonton', true, true, false)
ON CONFLICT DO NOTHING;

-- Employment & Career Programs
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('Prospect Youth Employment Services', 'Up to 16 weeks of job training plus 90-day follow-up. Includes certifications (First Aid, Forklift, Excel), financial assistance, and employer networking.', '{employment,job-training,career,free,indoor}', '{occupational,intellectual}', false, 18, 24, '#314, Kingsway Mall', 'Edmonton', 'https://www.prospectnow.ca/pyes/', 'Prospect Human Services', true, true, false),
('Prospect Youth Employment Connection', 'For youth who are/were supported by Childrens Services. Employability skills, career counseling, and work experience placements.', '{employment,job-training,career,free,indoor}', '{occupational,intellectual}', false, 16, 24, 'Edmonton', 'Edmonton', 'https://www.prospectnow.ca/pyec/', 'Prospect Human Services', true, true, false),
('YOUCAN Verto Project', '20-week program with intensive training in personal development, technology, and job readiness. Final 12 weeks are paid placement.', '{employment,job-training,technology,free,indoor}', '{occupational,intellectual}', false, 18, 24, 'Edmonton', 'Edmonton', 'https://www.youcan.ca/', 'YOUCAN Youth Services', true, true, false),
('EmployAbilities Learn 2 Earn', '22-week program for youth with disabilities or barriers. 10 weeks paid skills training plus 12 weeks work experience.', '{employment,job-training,accessibility,free,indoor}', '{occupational,intellectual}', false, 15, 30, 'Edmonton', 'Edmonton', 'https://employabilities.ab.ca/learn-2-earn/', 'EmployAbilities', true, true, false),
('BGS Career Ventures – Youth Services', 'Job search support, coaching, seminars, training, and job placement services for youth.', '{employment,career,job-training,free,indoor}', '{occupational,intellectual}', false, 15, 25, '#310, 10665 Jasper Avenue', 'Edmonton', 'https://www.bgscareerventures.com/youth-services/', 'BGS Enterprises Inc.', true, true, false),
('Bredin Centre – JobCO Youth Training', 'Employer-delivered worksite training for unemployed youth lacking skills or experience. Participants receive income during training.', '{employment,job-training,paid,indoor}', '{occupational,intellectual}', false, 15, 24, '5th floor, 10004 104 Avenue', 'Edmonton', 'https://www.bredin.ca/', 'Bredin Centre for Career Advancement', true, true, false),
('YWCA GirlSpace / Y-Space', 'Youth-led initiatives addressing social issues. Gender-inclusive programming with peer support and advocacy.', '{community,leadership,gender,free,indoor}', '{social,emotional,intellectual}', true, 13, 25, 'YWCA Edmonton', 'Edmonton', 'https://ywcaofedmonton.org/programs-and-services/youthprograms/', 'YWCA Edmonton', true, true, false),
('YWCA Dream It Be It', 'Career-building program for youth who identify as female. Goal setting, networking, and professional development.', '{employment,career,women,free,indoor}', '{occupational,intellectual}', false, 12, 17, 'YWCA Edmonton', 'Edmonton', 'https://ywcaofedmonton.org/programs-and-services/youthprograms/', 'YWCA Edmonton', true, true, false)
ON CONFLICT DO NOTHING;

-- Crisis & Emergency Services
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('Kids Help Phone', '24/7 free confidential counseling by phone, text, and online. Professional support for any issue.', '{crisis,mental-health,counseling,free}', '{emotional}', true, 5, 20, 'Phone/Text/Online', 'Edmonton', 'https://kidshelpphone.ca/', 'Kids Help Phone', true, false, false),
('YESS – Emergency Shelter & Crisis Support', 'Emergency shelter and crisis support for homeless and at-risk youth. 24/7 services.', '{crisis,shelter,housing,free,indoor}', '{physical,emotional}', true, 13, 24, 'Edmonton', 'Edmonton', 'https://www.yess.org', 'Youth Empowerment and Support Services', true, true, false),
('Sexual Assault Centre of Edmonton', 'Crisis intervention, counseling, education, and court support for survivors. Serves all genders including 2SLGBTQQIA+ individuals.', '{crisis,counseling,support,free,indoor}', '{emotional,physical}', true, 13, 99, 'Edmonton', 'Edmonton', 'https://www.sace.ab.ca/', 'Sexual Assault Centre of Edmonton', true, true, false)
ON CONFLICT DO NOTHING;

-- Community & Recreation Drop-Ins
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('ASSIST T.A.N.G. Youth Program', 'Workshops on self-esteem, communication, goal-setting, body image, peer pressure, and healthy relationships. Sports, crafts, field trips, and tutoring available.', '{community,life-skills,recreation,tutoring,free,indoor}', '{social,emotional,intellectual}', true, 12, 19, 'Multiple City of Edmonton rec centres', 'Edmonton', 'https://assistcsc.org/t-a-n-g-youth-program/', 'ASSIST Community Services', true, true, false),
('City of Edmonton – Youth After School Programs', 'Free after-school programs 3-6pm including Sports Explorer, volleyball drop-in, basketball, soccer, tutoring, STEM, and Indigenous Creative Corner.', '{recreation,sports,tutoring,stem,free,indoor}', '{physical,social,intellectual}', true, 8, 17, 'Multiple rec centres city-wide', 'Edmonton', 'https://www.edmonton.ca/programs_services/for_children_kids_youth/after-school-youth-programs', 'City of Edmonton', true, true, false),
('The Core Youth Centre', 'Mentoring and physical activity programs at recreation centres. Leadership development and community connection.', '{recreation,mentoring,leadership,free,indoor}', '{social,physical,emotional}', true, 12, 17, 'Various Edmonton rec centres', 'Edmonton', 'https://www.edmonton.ca/programs_services/for_children_kids_youth/after-school-youth-programs', 'City of Edmonton', true, true, false),
('Family Futures – Youth Connections Drop-In', 'After-school drop-in with painting, drawing, sculpting, drama, improv, board games, and physical activities. Building social connections in supportive environment.', '{community,arts,recreation,free,indoor}', '{social,emotional}', true, 8, 17, '3 City of Edmonton rec centres', 'Edmonton', 'https://familyfutures.ca/programs-services/drop-in-programs/', 'Family Futures Resource Network', true, true, false),
('Edmonton Public Library – Teen Space', 'Library teen programs including homework help, gaming, and social activities.', '{community,learning,free,indoor}', '{intellectual,social}', true, 13, 18, 'Multiple EPL branches', 'Edmonton', 'https://www.epl.ca/teens/', 'Edmonton Public Library', true, true, false),
('Edmonton Public Library – Makerspace', 'Free access to 3D printers, laser cutters, sewing machines, and tech equipment. Workshops and drop-in sessions for youth.', '{technology,maker,stem,free,indoor}', '{intellectual,occupational}', true, 13, 25, 'Stanley A. Milner Library, 7 Sir Winston Churchill Square', 'Edmonton', 'https://www.epl.ca/makerspace/', 'Edmonton Public Library', true, true, false),
('Edmonton Public Library – Homework Help', 'Free tutoring and homework assistance for students. Available at multiple branches.', '{tutoring,education,free,indoor}', '{intellectual}', true, 6, 18, 'Multiple EPL branches', 'Edmonton', 'https://www.epl.ca/homework-help/', 'Edmonton Public Library', true, true, false),
('Big Brothers Big Sisters Edmonton', 'Mentoring programs matching youth with adult mentors. In-school, community, and group mentoring available.', '{mentoring,community,support,free}', '{social,emotional}', false, 6, 18, 'Edmonton', 'Edmonton', 'https://www.bbbsedmonton.org/', 'Big Brothers Big Sisters Edmonton', true, true, false),
('Edmonton Food Bank – Youth Volunteer Program', 'Volunteer opportunities for youth to give back to the community while developing job skills.', '{volunteer,community,food-security,free,indoor}', '{social,occupational}', false, 13, 25, '11508 120 Street NW', 'Edmonton', 'https://www.edmontonsfoodbank.com/', 'Edmonton Food Bank', true, true, false)
ON CONFLICT DO NOTHING;

-- November/December 2025 Special Events
INSERT INTO programs (title, description, tags, wellness_dimensions, drop_in, age_min, age_max, address, city, website, organizer, free, indoor, outdoor)
VALUES 
('Edmonton Youth Orchestra – Fall Concert', 'Youth orchestra performance at Winspear Centre. November 30, 2025 at 2:00 PM.', '{arts,music,performance,indoor}', '{intellectual,social}', false, 8, 25, 'Winspear Centre, 4 Sir Winston Churchill Square', 'Edmonton', 'https://www.edmontonyouthorchestra.com/', 'Edmonton Youth Orchestra', false, true, false),
('A Kidsmas Carol – Holiday Performance', 'Family-friendly twist on A Christmas Carol. December 2025 at the Citadel Theatre.', '{arts,theater,holiday,indoor}', '{social,emotional}', false, 5, 99, 'Citadel Theatre, 9828 101A Ave', 'Edmonton', 'https://citadeltheatre.com/', 'Citadel Theatre', false, true, false),
('The Nutcracker – Ballet Performance', 'Classic holiday ballet performance. December 3-7, 2025 at Northern Alberta Jubilee Auditorium.', '{arts,dance,ballet,holiday,indoor}', '{intellectual,emotional}', false, 5, 99, 'Northern Alberta Jubilee Auditorium', 'Edmonton', 'https://jubileeauditorium.com/', 'Alberta Ballet', false, true, false),
('St. Albert Childrens Theatre', 'Musical theatre training in dramatics, vocals, and dance. Performance opportunities at The Arden Theatre. Operating 40+ years.', '{arts,theater,music,dance,indoor}', '{social,intellectual,physical}', false, 8, 18, 'The Arden Theatre, St. Albert', 'St. Albert', 'https://stalbert.ca/exp/sact/', 'City of St. Albert', false, true, false)
ON CONFLICT DO NOTHING;
