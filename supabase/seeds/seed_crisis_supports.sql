insert into public.crisis_supports(region, category, name, phone, text_code, chat_url, hours, notes, verified_at) values
('Canada','call','Emergency (Police/Fire/Ambulance)','911',null,null,'24/7','Immediate danger', now()),
('Canada','call','988 Suicide Crisis Helpline','988',null,null,'24/7','Call or text 988', now()),
('Canada','textchat','Kids Help Phone','1-800-668-6868','CONNECT to 686868','https://kidshelpphone.ca/live-chat','24/7','Youth-focused', now());

insert into public.crisis_supports(region, category, name, phone, text_code, chat_url, hours, notes, verified_at) values
('Alberta','call','Alberta Mental Health Help Line','1-877-303-2642',null,null,'24/7','Info & referral', now()),
('Alberta','call','Health Link','811',null,null,'24/7','Nurse advice', now()),
('Alberta','call','211 Alberta','211',null,'https://ab.211.ca/','24/7','Community services navigation', now());

insert into public.crisis_supports(region, category, name, phone, text_code, chat_url, hours, notes, verified_at) values
('Edmonton','call','CMHA Edmonton Distress Line','780-482-4357',null,null,'24/7','Distress Line (HELP)', now()),
('Edmonton','call','Alberta One Line for Sexual Violence','1-866-403-8000',null,'https://aasas.ca/','24/7','Information & support', now());

insert into public.crisis_supports(region, category, name, address, hours, notes, verified_at) values
('Edmonton','inperson','Nearest Emergency Department', null, '24/7','Go to your nearest ER or call 911', now());
