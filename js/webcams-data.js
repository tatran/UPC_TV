/**
 * Public Live Webcam Feeds from Slovakia
 * High-definition 1080p HLS video feeds
 */
(function(window) {
  'use strict';

  var SLOVAK_WEBCAMS = [
  {
    "id": "362-bezecky-areal-strbske-pleso",
    "name": "Bežecký Štrbské Pleso – Skokanský Areál, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/BEZ_AREAL.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=362&size=640x0"
  },
  {
    "id": "324-hrebienok",
    "name": "Hrebienok, Vysoké Tatry",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM14.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=324&size=640x0"
  },
  {
    "id": "339-lomnicke-sedlo",
    "name": "Lomnické Sedlo, Vysoké Tatry",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM44.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=339&size=640x0"
  },
  {
    "id": "333-lomnicky-stit-panorama",
    "name": "Lomnický Štít Panoráma, Vysoké Tatry",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM23.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=333&size=640x0"
  },
  {
    "id": "285-nizke-tatry",
    "name": "Nízke Tatry",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/KAMZIKY.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=285&size=640x0"
  },
  {
    "id": "160-panorama-vysokych-tatier",
    "name": "Panoráma Vysokých Tatier, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/PANORAMA_VT.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=160&size=640x0"
  },
  {
    "id": "340-skalnate-pleso-panorama",
    "name": "Skalnaté Pleso – Panoráma a Lomnický Štít, Vysoké Tatry",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM29.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=340&size=640x0"
  },
  {
    "id": "344-solisko-panorama",
    "name": "Solisko – Panoráma Vysokých Tatier, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM31.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=344&size=640x0"
  },
  {
    "id": "325-stary-smokovec",
    "name": "Starý Smokovec – Centrum, Starý Smokovec",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM15.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=325&size=640x0"
  },
  {
    "id": "168-vyhlad-na-zjazdovky",
    "name": "Štrbské Pleso – Areál Snov a Zjazdovky, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/VYHLAD_ZJAZDOVKY.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=168&size=640x0"
  },
  {
    "id": "164-vyhlad-na-jazero-s-panoramou",
    "name": "Štrbské Pleso – Jazero s Panorámou, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/VYHLAD_JAZERO.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=164&size=640x0"
  },
  {
    "id": "161-pohlad-na-moryho-vyhliadku",
    "name": "Štrbské Pleso – Móryho Vyhliadka, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/MORYHO_VYH.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=161&size=640x0"
  },
  {
    "id": "166-vyhlad-na-namestie-majstrovstiev-sveta",
    "name": "Štrbské Pleso – Námestie Ms, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/VYHLAD_NAMESTIE.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=166&size=640x0"
  },
  {
    "id": "167-vyhlad-na-nove-strbske-pleso",
    "name": "Štrbské Pleso – Nové Štrbské Pleso, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/VYHLAD_NOVESTRB.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=167&size=640x0"
  },
  {
    "id": "163-vyhlad-do-pohoria-vysokych-tatier",
    "name": "Štrbské Pleso – Panoráma Vysokých Tatier, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/VYHLAD_VT.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=163&size=640x0"
  },
  {
    "id": "159-areal-strbske-pleso",
    "name": "Štrbské Pleso – Skokanský Areál, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/STRB_AREAL.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=159&size=640x0"
  },
  {
    "id": "165-vyhlad-na-jazero-zo-skok-mostika",
    "name": "Štrbské Pleso – Skokanský Mostík, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/strba/VYHLAD_SKOK.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=165&size=640x0"
  },
  {
    "id": "343-strbske-pleso-panorama",
    "name": "Štrbské Pleso – Široká Panoráma, Štrbské Pleso",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr/STREAM32.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=343&size=640x0"
  },
  {
    "id": "341-tatranska-lomnica-panorama",
    "name": "Tatranská Lomnica – Panoráma, Tatranská Lomnica",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM33.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=341&size=640x0"
  },
  {
    "id": "342-tatranska-lomnica-start",
    "name": "Tatranská Lomnica – Štart, Tatranská Lomnica",
    "category": "Vysoké Tatry",
    "location": "Vysoké Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM34.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=342&size=640x0"
  },
  {
    "id": "328-biela-put-panorama",
    "name": "Biela Púť Panoráma, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM3.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=328&size=640x0"
  },
  {
    "id": "315-brhliska",
    "name": "Brhliská, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM5.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=315&size=640x0"
  },
  {
    "id": "314-chopok-freeride-zone",
    "name": "Chopok - Freeride Zone, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr/STREAM40.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=314&size=640x0"
  },
  {
    "id": "313-chopok-vychod",
    "name": "Chopok Východ, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM6.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=313&size=640x0"
  },
  {
    "id": "308-chopok-zapad",
    "name": "Chopok Západ, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM7.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=308&size=640x0"
  },
  {
    "id": "336-predne-derese",
    "name": "Jasná – Predné Dereše, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM25.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=336&size=640x0"
  },
  {
    "id": "326-priehyba-panorama",
    "name": "Jasná – Priehyba a Chopok, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM9.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=326&size=640x0"
  },
  {
    "id": "348-rovna-hola",
    "name": "Jasná – Rovná Hoľa, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM56.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=348&size=640x0"
  },
  {
    "id": "335-vyhliadka",
    "name": "Jasná – Východná Vyhliadka",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM47.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=335&size=640x0"
  },
  {
    "id": "312-zahradky",
    "name": "Jasná – Záhradky",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM43.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=312&size=640x0"
  },
  {
    "id": "156-kamenna-chata",
    "name": "Kamenná Chata, Chopok Juh",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/KAMIENKA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=156&size=640x0"
  },
  {
    "id": "319-konsky-grun",
    "name": "Konský Grúň, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM17.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=319&size=640x0"
  },
  {
    "id": "320-kosodrevina-panorama",
    "name": "Kosodrevina Panoráma, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM21.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=320&size=640x0"
  },
  {
    "id": "321-krupova",
    "name": "Krupová, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr/STREAM39.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=321&size=640x0"
  },
  {
    "id": "353-kubinska-hola",
    "name": "Kubínska Hoľa",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/kubinskahola/KH_STREAM1.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=353&size=640x0"
  },
  {
    "id": "355-kubinska-hola-ii",
    "name": "Kubínska Hoľa II",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/kubinskahola/KH_STREAM2.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=355&size=640x0"
  },
  {
    "id": "356-kubinska-hola-iii",
    "name": "Kubínska Hoľa III",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/kubinskahola/KH_STREAM3.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=356&size=640x0"
  },
  {
    "id": "357-kubinska-hola-iv",
    "name": "Kubínska Hoľa IV",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/kubinskahola/KH_STREAM4.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=357&size=640x0"
  },
  {
    "id": "354-kubinska-hola-vi",
    "name": "Kubínska Hoľa Vi",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/kubinskahola/KH_STREAM6.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=354&size=640x0"
  },
  {
    "id": "327-lukova-panorama",
    "name": "Luková Panorama, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM18.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=327&size=640x0"
  },
  {
    "id": "279-nizke-tatry-panorama-ii",
    "name": "Nízke Tatry Panoráma Ii, Jasná",
    "category": "Nízke Tatry & Jasná",
    "location": "Nízke Tatry",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/ROZHLADNA2.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=279&size=640x0"
  },
  {
    "id": "317-aquapark-besenova-ii",
    "name": "Aquapark Bešeňová – Termálne Bazény – Relaxačný Bazén, Bešeňová",
    "category": "Aquaparky & Kúpele",
    "location": "Liptov",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM51.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=317&size=640x0"
  },
  {
    "id": "316-aquapark-besenova",
    "name": "Aquapark Bešeňová – Termálne Bazény, Bešeňová",
    "category": "Aquaparky & Kúpele",
    "location": "Liptov",
    "streamUrl": "https://stream2.profi-net.sk:443/tmr//STREAM52.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=316&size=640x0"
  },
  {
    "id": "310-aquapark-tatralandia-tropical-paradise",
    "name": "Aquapark Tatralandia – Hlavný Areál – Tropical Paradise, Liptovský Mikuláš",
    "category": "Aquaparky & Kúpele",
    "location": "Liptov",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM2.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=310&size=640x0"
  },
  {
    "id": "323-aquapark-tatralandia-ii",
    "name": "Aquapark Tatralandia – Hlavný Areál – Vonkajšie Bazény, Liptovský Mikuláš",
    "category": "Aquaparky & Kúpele",
    "location": "Liptov",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM12.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=323&size=640x0"
  },
  {
    "id": "322-aquapark-tatralandia",
    "name": "Aquapark Tatralandia – Hlavný Areál, Liptovský Mikuláš",
    "category": "Aquaparky & Kúpele",
    "location": "Liptov",
    "streamUrl": "https://stream.profi-net.sk:443/tmr//STREAM48.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=322&size=640x0"
  },
  {
    "id": "351-muzeum-liptovskej-dediny-skanzen-pribylina",
    "name": "Múzeum Liptovskej Dediny Skanzen Pribylina – Bocianie Hniezdo, Pribylina",
    "category": "Príroda & Fauna",
    "location": "Slovenská fauna",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/SKANZENPRIBYLINA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=351&size=640x0"
  },
  {
    "id": "191-part-lupca",
    "name": "Partizánska Ľupča – Hniezdo Bocianov",
    "category": "Príroda & Fauna",
    "location": "Slovenská fauna",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/BOCIANY_LUPCA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=191&size=640x0"
  },
  {
    "id": "346-pribylina",
    "name": "Pribylina – Bocianie Hniezdo, Pribylina",
    "category": "Príroda & Fauna",
    "location": "Slovenská fauna",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/BOCIANY_PRIBYLINA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=346&size=640x0"
  },
  {
    "id": "282-syslovske-polia-krmidlo",
    "name": "Sysľovské Polia – Kŕmidlo Dravcov",
    "category": "Príroda & Fauna",
    "location": "Slovenská fauna",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/DRAVCE_KRMIDLO.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=282&size=640x0"
  },
  {
    "id": "345-velka-lomnica",
    "name": "Veľká Lomnica – Hniezdo Bocianov, Veľká Lomnica",
    "category": "Príroda & Fauna",
    "location": "Slovenská fauna",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/BOCIANY_VELKALOMNICA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=345&size=640x0"
  },
  {
    "id": "205-brest",
    "name": "Břest",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/BOCIANY_BREST.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=205&size=640x0"
  },
  {
    "id": "150-donovaly-funpark",
    "name": "Donovaly Funpark, Donovaly",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/donovaly/FUNPARK.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=150&size=640x0"
  },
  {
    "id": "269-donovaly-parksnow",
    "name": "Donovaly Parksnow, Donovaly",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/donovaly/NH_DOJAZD2.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=269&size=640x0"
  },
  {
    "id": "169-donovaly-zahradiste",
    "name": "Donovaly Záhradište, Donovaly",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/donovaly/DONOVALY.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=169&size=640x0"
  },
  {
    "id": "292-fun-park-ziarce",
    "name": "Fun Park Žiarce, Pavčina Lehota",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/ZIARCE.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=292&size=640x0"
  },
  {
    "id": "268-holubyho-chata",
    "name": "Holubyho Chata",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/HOLUBYHOCHATA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=268&size=640x0"
  },
  {
    "id": "307-krivan-pohlad-z-hotela-permon",
    "name": "Kriváň, Pohľad z Hotela Permon",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/live/PERMON.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=307&size=640x0"
  },
  {
    "id": "157-kromeriz-ul-hulinska",
    "name": "Kromeříž, Ul. Hulínska",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/KROMERIZ.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=157&size=640x0"
  },
  {
    "id": "332-kupele-aphrodite-rajecke-teplice",
    "name": "Kúpele Aphrodite, Rajecké Teplice",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/commercial/RAJECKETEPLICE.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=332&size=640x0"
  },
  {
    "id": "359-ladce",
    "name": "Ladce",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/LADCEBUTKOV.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=359&size=640x0"
  },
  {
    "id": "360-ski-podbreziny",
    "name": "Liptovský Mikuláš – Ski Podbreziny",
    "category": "Mestá & Regióny",
    "location": "Liptovský Mikuláš",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/SKIPODBREZINY.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=360&size=640x0"
  },
  {
    "id": "190-liskova",
    "name": "Lisková, Lisková",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/BOCIANY_LISKOVA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=190&size=640x0"
  },
  {
    "id": "173-malino-brdo-hrabovo-dojazd",
    "name": "Malino Brdo - Hrabovo Dojazd",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/mb/MALINO4.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=173&size=640x0"
  },
  {
    "id": "171-malino-brdo-panorama",
    "name": "Malino Brdo Panoráma",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/mb/MALINO2.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=171&size=640x0"
  },
  {
    "id": "306-malino-brdo-vlek",
    "name": "Malino Brdo Vlek",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream2.profi-net.sk:443/mb/MALINO7.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=306&size=640x0"
  },
  {
    "id": "192-malino-brdo-vleky",
    "name": "Malino Brdo Vleky",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/mb/MALINO6.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=192&size=640x0"
  },
  {
    "id": "197-marina-liptov",
    "name": "Marina Liptov",
    "category": "Mestá & Regióny",
    "location": "Liptovský Mikuláš",
    "streamUrl": "https://stream2.profi-net.sk:443/live/MARINA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=197&size=640x0"
  },
  {
    "id": "337-nova-hola-horska-zachranna-sluzba",
    "name": "Nová Hola - Horská Záchranná Služba, Donovaly",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/HSNH.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=337&size=640x0"
  },
  {
    "id": "162-obec-strba",
    "name": "Obec Štrba",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/strba/OBEC_STRBA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=162&size=640x0"
  },
  {
    "id": "187-podbanske-vlek",
    "name": "Podbanské – Areál Grand Hotel Permon",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://stream.profi-net.sk:443/live/PERMON_VLEK.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=187&size=640x0"
  },
  {
    "id": "280-ruzomberok-krizovatka-scp",
    "name": "Ružomberok – Križovatka Scp, Ružomberok",
    "category": "Mestá & Regióny",
    "location": "Ružomberok",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/SCP.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=280&size=640x0"
  },
  {
    "id": "352-ruzomberok-panorama",
    "name": "Ružomberok – Mestská Panoráma, Ružomberok",
    "category": "Mestá & Regióny",
    "location": "Ružomberok",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/RKPANO.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=352&size=640x0"
  },
  {
    "id": "361-ruzomberok-nabrezie-m-r-stefanika-ii",
    "name": "Ružomberok – Nábrežie M.r. Štefánika, Ružomberok",
    "category": "Mestá & Regióny",
    "location": "Ružomberok",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/STEFANICKA2.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=361&size=640x0"
  },
  {
    "id": "350-smrekovica",
    "name": "Smrekovica – Horský Hotel",
    "category": "Mestá & Regióny",
    "location": "Veľká Fatra",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/SMREKOVICA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=350&size=640x0"
  },
  {
    "id": "304-smrekovica-2",
    "name": "Smrekovica – Horský Hotel – Horský Hotel II",
    "category": "Mestá & Regióny",
    "location": "Veľká Fatra",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/SMREKOVICA2.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=304&size=640x0"
  },
  {
    "id": "305-smrekovica-3",
    "name": "Smrekovica – Horský Hotel – Horský Hotel III",
    "category": "Mestá & Regióny",
    "location": "Veľká Fatra",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/SMREKOVICA3.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=305&size=640x0"
  },
  {
    "id": "276-vysna-boca",
    "name": "Vyšná Boca – Horská Obec",
    "category": "Mestá & Regióny",
    "location": "Nízke Tatry / Boca",
    "streamUrl": "https://kukaj.profi-net.sk:443/live/BOCA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=276&size=640x0"
  },
  {
    "id": "300-zavazna-poruba-panorama",
    "name": "Závažná Poruba – Opalisko",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/ZAVAZNAPORUBA_PANORAMA.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=300&size=640x0"
  },
  {
    "id": "299-ziar-dolinky",
    "name": "Žiar – Areál Dolinky, Žiar",
    "category": "Mestá & Regióny",
    "location": "Slovensko",
    "streamUrl": "https://kukaj.profi-net.sk:443/commercial/ZIARDOLINKY.stream/playlist.m3u8",
    "badge": "LIVE 1080p",
    "thumbnail": "https://www.zivekamery.sk/webkameraloader.php?id=299&size=640x0"
  }
];

  window.SLOVAK_WEBCAMS = SLOVAK_WEBCAMS;
})(window);
