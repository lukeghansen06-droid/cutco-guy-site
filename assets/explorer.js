/* assets/explorer.js — "Explore every Cutco piece" on /find.
 * Ported from the original single-page explorer. Self-contained: bails if #expGrid is absent.
 * Images are served locally from /assets/products/<SKU>.jpg (Cutco CDN is referer-blocked cross-origin).
 * Real Cutco prices as of June 2026 — never auto-updates; always links cutco.com to confirm.
 */
(function(){
  function track(t,l){
    if(window.__cutcoNoTrack) return; // Owner No-Track Mode
    try{
      var data=JSON.stringify({t:t,l:(l||'').toString().slice(0,120)});
      if(navigator.sendBeacon){ navigator.sendBeacon('/api/track', new Blob([data],{type:'application/json'})); }
      else { fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:data,keepalive:true}).catch(function(){}); }
    }catch(e){}
  }
  track('page','home');
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a'):null; if(!a) return;
    var href=a.getAttribute('href')||'';
    if(href.indexOf('calendly')>-1) track('book',(a.textContent||'').replace(/\s+/g,' ').trim().slice(0,40));
  });

  // ===== Cutco product explorer + wishlist =====
    var grid=document.getElementById('expGrid'); if(!grid) return;
    var U={chef:'https://www.cutco.com/shop/chef-knives',sant:'https://www.cutco.com/shop/santoku-style-knives',par:'https://www.cutco.com/shop/paring-knives',carve:'https://www.cutco.com/shop/carving-slicing-knives',cheese:'https://www.cutco.com/shop/cheese-knives',spec:'https://www.cutco.com/shop/specialty-knives',util:'https://www.cutco.com/shop/utility-knives',kn:'https://www.cutco.com/shop/kitchen-knives',tbl:'https://www.cutco.com/shop/table-steak-knives',out:'https://www.cutco.com/shop/outdoor-knives',tools:'https://www.cutco.com/shop/cooks-tools',cook:'https://www.cutco.com/shop/cookware',ware:'https://www.cutco.com/shop/tableware',sets:'https://www.cutco.com/shop/knife-sets',gifts:'https://www.cutco.com/shop/gift-sets',shears:'https://www.cutco.com/p/super-shears'};
    var ICONS={
      knife:'<path d="M3 18 18 3c1.7-1.7 4 0 4 2.3C22 9 17 14 9 18l-3 3z"/><path d="m3 18 3 3"/>',
      santoku:'<path d="M3 14h13c2.6 0 5 .9 5 2s-2.4 2-5 2H3z"/><path d="M3 14c.4-2.4 3.4-3.2 7-3.2"/>',
      cleaver:'<rect x="4" y="4" width="12" height="9" rx="1"/><path d="M16 6h2.5v4H16"/><path d="M7 13v8"/>',
      fillet:'<path d="M2 12c5-4.5 14-5.5 20-2.5C16 12.5 7 11.5 2 12z"/><path d="M2 12c5 4.5 14 5.5 20 2.5"/>',
      cheese:'<path d="M3 17 19 8.5 21 17z"/><circle cx="9" cy="15" r="1"/><circle cx="14" cy="14.4" r="1"/>',
      table:'<path d="M7 3v18"/><path d="M7 3c3.2 0 6 1.8 6 4.5S10.2 12 7 12"/>',
      shears:'<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><line x1="8" y1="8.4" x2="20" y2="18"/><line x1="8" y1="15.6" x2="20" y2="6"/>',
      tool:'<path d="M14 3a4 4 0 0 0-1.3 7.2L4 19l1.7 1.7 8.8-8.6A4 4 0 0 0 19 7l-2.6 2.6-1.9-1.9L17 5"/>',
      spoon:'<ellipse cx="8" cy="6" rx="3.2" ry="4"/><path d="M8 10c0 2 .8 3 2 4l1 7"/>',
      board:'<rect x="4" y="3" width="12" height="17" rx="2"/><circle cx="19" cy="6" r="1.6"/>',
      pot:'<path d="M4 9h14v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><line x1="2.5" y1="9" x2="19.5" y2="9"/><line x1="18" y1="11" x2="22" y2="11"/><line x1="4" y1="11" x2="0" y2="11"/>',
      pan:'<circle cx="9.5" cy="13" r="6"/><line x1="15" y1="9" x2="23" y2="4.5"/>',
      flatware:'<path d="M7 3v18"/><path d="M5 3v4a2 2 0 0 0 4 0V3"/><path d="M16 3c-2 0-3.2 3.2-3.2 6H16z"/><path d="M16 9v12"/>',
      hunting:'<path d="M2.5 16 14 4.5l4 4L7 20z"/><rect x="13.5" y="4" width="6" height="3.2" rx="1"/>',
      pocket:'<path d="M3 14c6-1 12-4 18-9 1.2 4.2-2 9.2-8 11.2C9 17.4 5 16.2 3 14z"/>',
      fish:'<path d="M3 12c4-4 10-5 15-3 2 .9 4 2 4 3s-2 2.1-4 3c-5 2-11 1-15-3z"/><path d="m19 9 2.5-3M19 15l2.5 3"/><circle cx="8" cy="11" r=".7"/>',
      golf:'<circle cx="12" cy="6" r="3"/><line x1="12" y1="9" x2="12" y2="21"/><path d="M12 12l6-2"/>',
      set:'<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M7.5 9 8.5 3M11.5 9l1-6M15.5 9l1-6"/>',
      gift:'<rect x="3" y="9.5" width="18" height="10.5" rx="2"/><line x1="12" y1="9.5" x2="12" y2="20"/><path d="M12 9.5C9 9.5 7 3.5 12 3.5s3 6 0 6"/>',
      sharpener:'<rect x="4" y="11" width="16" height="6" rx="2"/><path d="M9 11 11 4.5 13 11"/>',
      peeler:'<path d="M6 3v8a3.5 3.5 0 0 0 7 0V3z"/><line x1="9.5" y1="14.5" x2="9.5" y2="21"/>'
    };
    var P=[
      {n:'9-1/4" French Chef',c:'knives',ic:'knife',d:'The one knife that does almost everything — rock through onions, herbs and weeknight dinners like a pro.',k:'chef chopping slicing dicing vegetables all-purpose rocking',u:U.chef},
      {n:'7-5/8" Petite Chef',c:'knives',ic:'knife',d:'All the power of a chef’s knife in a lighter, nimbler blade that’s easy to control.',k:'chef petite vegetables prep all-purpose smaller hands',u:U.chef},
      {n:'7" Santoku',c:'knives',ic:'santoku',d:'Thin, razor-sharp and Japanese-inspired — falls straight through tomatoes, fish and vegetables.',k:'santoku chopping slicing dicing vegetables sushi asian',u:U.sant},
      {n:'5" Petite Santoku',c:'knives',ic:'santoku',d:'The little workhorse you’ll grab for almost everything, from garlic to grapes.',k:'santoku petite slicing dicing everyday vegetables',u:U.sant},
      {n:'Santoku-Style Trimmer',c:'knives',ic:'santoku',d:'A santoku spin on the everyday utility knife — nimble enough for fast, fine prep.',k:'utility trimmer prep vegetables fruit santoku',u:U.sant},
      {n:'Trimmer (Utility Knife)',c:'knives',ic:'knife',d:'The knife that never leaves the counter — sandwiches, snacks, trimming the fat, you name it.',k:'utility trimmer prep slicing trimming fat vegetables everyday',u:U.util},
      {n:'4" Vegetable Knife',c:'knives',ic:'knife',d:'Small, sharp and quick for radishes, shallots and all the little jobs.',k:'vegetable veggies slicing dicing small produce precision',u:U.kn},
      {n:'6" Vegetable Knife',c:'knives',ic:'knife',d:'A wide blade that chops clean and scoops everything straight into the pan.',k:'vegetable veggies chopping slicing dicing onions scoop',u:U.kn},
      {n:'7-1/2" Vegetable Knife',c:'knives',ic:'knife',d:'Cutco’s dedicated veg blade — mountains of onions and peppers, perfectly diced.',k:'vegetable veggies chopping slicing dicing onions prep',u:U.kn},
      {n:'2-3/4" Paring Knife',c:'knives',ic:'knife',d:'The trusty little blade for hulling berries, peeling apples and all the detail work.',k:'paring peeling fruit vegetables prep small precision',u:U.par},
      {n:'4" Paring Knife',c:'knives',ic:'knife',d:'A touch more reach for total control on fruit, garnishes and fine cuts.',k:'paring peeling precision control fruit vegetables',u:U.par},
      {n:'Gourmet Paring Knife',c:'knives',ic:'knife',d:'A wider paring blade that powers right through apples, potatoes and firm produce.',k:'paring gourmet peeling apples potatoes fruit',u:U.par},
      {n:'Bird’s Beak Paring Knife',c:'knives',ic:'knife',d:'The curved blade chefs reach for to peel round produce and turn out pretty garnishes.',k:'paring birds beak tourne garnish peeling round',u:U.par},
      {n:'9" Carver',c:'knives',ic:'carve',d:'Long, smooth strokes for picture-perfect slices of turkey, ham and Sunday roast.',k:'carver carving roast turkey ham holidays slicing',u:U.carve},
      {n:'6-3/4" Petite Carver',c:'knives',ic:'carve',d:'Right-sized for carving chicken, pork loin and weeknight roasts.',k:'carver petite carving chicken pork meat',u:U.carve},
      {n:'9-3/4" Slicer (Bread Knife)',c:'knives',ic:'knife',d:'Saws through crackly sourdough and soft sandwich loaves alike — never squashes.',k:'bread slicer loaf shredding slicing crusty',u:U.carve},
      {n:'Petite Slicer (Bread Knife)',c:'knives',ic:'knife',d:'A shorter bread knife that glides cleanly through fresh loaves and bagels.',k:'bread petite slicer loaf no squash',u:U.carve},
      {n:'Cleaver',c:'knives',ic:'cleaver',d:'Big, confident chops through hard squash, spareribs and the toughest jobs.',k:'cleaver chopping spareribs bone heavy duty butchering',u:U.spec},
      {n:'Butcher Knife',c:'knives',ic:'cleaver',d:'Breaks down roasts and big cuts of meat with serious, steady power.',k:'butcher meat breaking down large cuts heavy duty',u:U.spec},
      {n:'Boning Knife',c:'knives',ic:'fillet',d:'A thin, flexible blade that hugs the bone so nothing good goes to waste.',k:'boning deboning meat flexible skin butchering',u:U.spec},
      {n:'Salmon Knife',c:'knives',ic:'fillet',d:'Long and flexible for whisper-thin, restaurant-worthy fillets of salmon and fish.',k:'salmon fillet fish thin slices flexible seafood',u:U.spec},
      {n:'Hardy Slicer',c:'knives',ic:'knife',d:'Thick and tough — built for hard squash and dense produce that dulls lesser knives.',k:'hardy tough vegetables squash hard produce heavy duty',u:U.spec},
      {n:'Gourmet Prep Knife',c:'knives',ic:'knife',d:'A bold, thick-bladed prepper for the heavy-duty cutting other knives flinch at.',k:'prep gourmet heavy duty tough produce chopping',u:U.spec},
      {n:'Cheese Knife',c:'knives',ic:'cheese',d:'Glides from sharp cheddar to soft brie — plus cured meats and produce.',k:'cheese entertaining charcuterie cured meats slicing',u:U.cheese},
      {n:'Traditional Cheese Knife',c:'knives',ic:'cheese',d:'The charcuterie-board hero for cheeses, salami and everything in between.',k:'cheese traditional charcuterie entertaining slicing',u:U.cheese},
      {n:'Spatula Spreader',c:'knives',ic:'tool',d:'Mix, spread, slice and serve — the clever multitasker that lives by the toaster.',k:'spreader butter frosting sandwich serving mixing',u:U.util},
      {n:'Table Knife',c:'table',ic:'table',d:'Cutco’s legendary table knife — so loved that families quietly fight over it at dinner.',k:'table dinner mealtime all-purpose place setting everyday',u:U.tbl},
      {n:'Stainless Table Knife',c:'table',ic:'table',d:'That famous table knife in a sleek, all-stainless design.',k:'table stainless dinner mealtime place setting',u:U.tbl},
      {n:'Steak Knife',c:'table',ic:'table',d:'Big, bold and seriously sharp — glides through the thickest steak with no sawing.',k:'steak meat dinner mealtime sharp place setting',u:U.tbl},
      {n:'Table Knife Sets (4–12 pc)',c:'table',ic:'set',d:'Cutco’s iconic table knife, boxed in sets of 4 to 12 — a wedding-registry classic.',k:'table knives set gift wedding block dinnerware',u:U.tbl},
      {n:'4-Pc. Steak Knife Set',c:'table',ic:'set',d:'Four big, bold steak knives, gift-boxed and ready to wow.',k:'steak knives set gift dinnerware meat',u:U.tbl},
      {n:'Super Shears',c:'tools',ic:'shears',d:'The take-apart shears you’ll reach for daily — snip herbs, spatchcock chicken, even open packaging.',k:'shears scissors herbs poultry packaging take-apart',u:U.shears},
      {n:'Vegetable Peeler',c:'tools',ic:'peeler',d:'Sails over apples, carrots and even firm skins without dragging or skipping.',k:'peeler vegetables fruit prep',u:U.tools},
      {n:'Ice Cream Scoop',c:'tools',ic:'spoon',d:'A thin, sharp edge that digs into rock-hard ice cream like it’s soft serve.',k:'ice cream scoop dessert frozen',u:U.tools},
      {n:'Pizza Cutter',c:'tools',ic:'tool',d:'Rolls clean through pizza, quesadillas and pasta; pops apart to wash.',k:'pizza cutter quesadilla pasta',u:U.tools},
      {n:'Can Opener',c:'tools',ic:'tool',d:'A sturdy, smooth-turning can opener that’ll outlast the whole drawer.',k:'can opener kitchen tool',u:U.tools},
      {n:'Wine Opener',c:'tools',ic:'tool',d:'Pulls corks smoothly so you open the bottle without the wrestling match.',k:'wine corkscrew opener entertaining',u:U.tools},
      {n:'Knife Sharpener',c:'tools',ic:'sharpener',d:'Holds your straight-edge Cutco at the perfect angle for a fresh edge at home.',k:'sharpener knife care maintenance',u:U.tools},
      {n:'Mix-Stir',c:'tools',ic:'tool',d:'A clever coil whisk that whips dressings, batters and gravy perfectly lump-free.',k:'whisk mixing batter marinade',u:U.tools},
      {n:'Slotted Turner',c:'tools',ic:'tool',d:'Thin and flexible — slides right under burgers, pancakes and over-easy eggs.',k:'turner spatula flipping eggs pancakes',u:U.tools},
      {n:'Serving Spoons & Ladle',c:'tools',ic:'spoon',d:'Basting and slotted spoons plus a no-drip ladle — the serving trio for soups and stews.',k:'spoon ladle serving soup stew basting slotted',u:U.tools},
      {n:'Potato Masher',c:'tools',ic:'tool',d:'A grated design that turns out fluffy, low-lump mash every single time.',k:'masher potatoes squash mashing',u:U.tools},
      {n:'Carving / Turning Fork',c:'tools',ic:'flatware',d:'Sharp tines that grip and steady the roast while you carve clean slices.',k:'carving fork roast meat',u:U.tools},
      {n:'Cutting Boards',c:'tools',ic:'board',d:'Lightweight, edge-friendly boards that protect your blades and your countertop.',k:'cutting board prep knife-safe',u:U.tools},
      {n:'Kitchen Tool Sets (5–6 pc)',c:'tools',ic:'set',d:'Mirror-polished tools to stir, flip, serve, mash and whip — beautifully matched.',k:'utensil set tools serving holder',u:U.tools},
      {n:'Slice n’ Serve / Turn n’ Serve',c:'tools',ic:'tool',d:'The all-in-one tools that slice and serve even the most delicate desserts.',k:'dessert serving slicing pie portioning',u:U.tools},
      {n:'Gourmet Fry Pans (8/10/12")',c:'cookware',ic:'pan',d:'Heavy 5-ply pans that heat evenly for restaurant-level searing and sautéing.',k:'fry pan skillet searing saute eggs',u:U.cook},
      {n:'Sauce Pans (1/2/3 Qt)',c:'cookware',ic:'pot',d:'Everyday 5-ply workhorses for sauces, soups, rice and veg.',k:'sauce pan simmer soup rice vegetables',u:U.cook},
      {n:'11-1/2" Skillet & Cover',c:'cookware',ic:'pan',d:'A big 5-ply skillet that browns, fries and braises like a dream.',k:'skillet frying browning braising',u:U.cook},
      {n:'Dutch Oven (4 / 6.3 Qt)',c:'cookware',ic:'pot',d:'A 5-ply Dutch oven for low-and-slow braises on any cooktop — induction included.',k:'dutch oven braising stew induction',u:U.cook},
      {n:'10 Qt. Stock Pot',c:'cookware',ic:'pot',d:'Built for big-batch soups, chili, homemade stock and pasta night.',k:'stock pot soup stew pasta large',u:U.cook},
      {n:'Wok & Cover',c:'cookware',ic:'pot',d:'A 5-ply wok that holds high heat for fast, smoky stir-fries.',k:'wok stir fry asian',u:U.cook},
      {n:'Steamer / Double Boiler Inserts',c:'cookware',ic:'pot',d:'Steam crisp-tender veg or gently melt chocolate right over your sauce pan.',k:'steamer double boiler melting chocolate vegetables',u:U.cook},
      {n:'Cookware Sets (Aspiring→Complete)',c:'cookware',ic:'set',d:'Curated 5-ply sets that build a pro-level kitchen — from starter to complete collection.',k:'cookware set starter professional complete 5-ply',u:U.cook},
      {n:'Stainless Place Settings',c:'flatware',ic:'flatware',d:'Mirror-polish place settings that complete the table beside your Cutco table knife.',k:'flatware place setting dining fork spoon',u:U.ware},
      {n:'60-Pc. Flatware Set in Chest',c:'flatware',ic:'gift',d:'Service for twelve in a keepsake chest — an absolute wedding-registry showstopper.',k:'flatware wedding chest service for 12 registry gift',u:U.ware},
      {n:'Serving & Hostess Sets',c:'flatware',ic:'flatware',d:'Serving spoons, forks, gravy ladle and butter knife — everything the host reaches for.',k:'serving spoon fork gravy ladle hostess entertaining',u:U.ware},
      {n:'Individual Flatware',c:'flatware',ic:'flatware',d:'Dinner and salad forks, tea and soup spoons — build or complete your set, piece by piece.',k:'flatware fork spoon teaspoon dining place setting',u:U.ware},
      {n:'Hunting Knife',c:'outdoors',ic:'hunting',d:'The field-dressing staple trusted from small game to big — and it comes with a leather sheath.',k:'hunting field dressing game deer big game sheath',u:U.out},
      {n:'Gut Hook Hunting Knife',c:'outdoors',ic:'hunting',d:'A built-in gut hook that makes field dressing and skinning quick and clean.',k:'hunting gut hook skinning field dressing deer game',u:U.out},
      {n:'Drop Point Hunting Knife',c:'outdoors',ic:'hunting',d:'Hunters love its sure control and an edge that just keeps going.',k:'hunting drop point skinning game outdoorsman',u:U.out},
      {n:'Clip Point Outdoor Knife',c:'outdoors',ic:'hunting',d:'A fine clip point for precise cuts and clean punctures out in the field.',k:'outdoor clip point hunting camping precision',u:U.out},
      {n:'CUTCO/KA-BAR Outdoorsman',c:'outdoors',ic:'hunting',d:'A heavy-duty camp and bushcraft blade with swappable handles for any adventure.',k:'camping outdoor survival bushcraft ka-bar heavy duty',u:U.out},
      {n:'CUTCO/KA-BAR Explorer',c:'outdoors',ic:'hunting',d:'An all-around outdoor fixed blade backed by KA-BAR’s legendary heritage.',k:'camping outdoor survival ka-bar fixed blade',u:U.out},
      {n:'Fisherman’s Solution',c:'outdoors',ic:'fish',d:'An adjustable 6–9" fillet blade with a sheath packed with handy angler tools.',k:'fillet fish fishing salmon adjustable sheath angler',u:U.out},
      {n:'Pocket Knife',c:'outdoors',ic:'pocket',d:'A sharp, handy folder that rides easily in a pocket or purse.',k:'pocket edc folding sporting everyday carry',u:U.out},
      {n:'2-3/4" Lockback Knife',c:'outdoors',ic:'pocket',d:'A compact locking folder — strong, agile and ready whenever you need it.',k:'lockback folding edc sporting outdoorsman',u:U.out},
      {n:'Golf Mate',c:'outdoors',ic:'golf',d:'A clever 2-in-1 divot repair tool and blade on a key ring — the golfer’s gift.',k:'golf divot tool sporting gift golfer',u:U.out},
      {n:'Homemaker +8 Set with Block',c:'sets',ic:'set',d:'Cutco’s bestselling family set — 10 core pieces plus 8 table knives in a block.',k:'full kitchen block set bestseller wedding gift family homemaker',u:U.sets},
      {n:'Homemaker Set with Block',c:'sets',ic:'set',d:'The core kitchen foundation set in a block.',k:'kitchen block set wedding foundation homemaker everyday',u:U.sets},
      {n:'Homemaker Set with Trays',c:'sets',ic:'set',d:'The core Homemaker pieces stored in in-drawer trays.',k:'kitchen tray drawer wedding foundation homemaker',u:U.sets},
      {n:'Galley + 6 Set with Block',c:'sets',ic:'set',d:'The Galley seven plus six more pieces in a block.',k:'kitchen block set mid-size galley expanded',u:U.sets},
      {n:'Galley Set with Block',c:'sets',ic:'set',d:'Seven core knives plus a board in a 7-slot block.',k:'kitchen block set mid-size starter galley',u:U.sets},
      {n:'Gourmet Set with Block',c:'sets',ic:'set',d:'A 5-piece specialty knife set you’ll reach for daily.',k:'kitchen block specialty gourmet',u:U.sets},
      {n:'Studio Set with Block',c:'sets',ic:'set',d:'A compact 6-piece starter set in a block.',k:'starter small kitchen budget first apartment block studio',u:U.sets},
      {n:'Essentials Set with Block',c:'sets',ic:'set',d:'A 5-piece set of everyday essentials in a block.',k:'starter essentials block budget first kitchen',u:U.sets},
      {n:'Kitchenette Set with Tray',c:'sets',ic:'set',d:'A small but strong combo of popular pieces in a tray.',k:'starter small kitchen drawer tray budget first apartment kitchenette',u:U.sets},
      {n:'Space Saver Set with Block',c:'sets',ic:'set',d:'Five key knives in a unique block built for small spaces.',k:'starter small space block compact apartment',u:U.sets},
      {n:'Signature Set with Block',c:'sets',ic:'set',d:'A complete, classic kitchen block set.',k:'complete kitchen block premium wedding signature',u:U.sets},
      {n:'Ultimate Set with Block',c:'sets',ic:'set',d:'The absolutely complete luxury block set (free engraved plate).',k:'complete kitchen block premium luxury wedding ultimate',u:U.sets},
      {n:'The Complete Kitchen Collection',c:'sets',ic:'set',d:'Everything for cooking, baking, grilling & entertaining — the works.',k:'complete kitchen everything ultimate luxury baking grilling',u:U.sets},
      {n:'3-Pc. Knife & Sheath Set',c:'sets',ic:'set',d:'Three top everyday knives with drawer sheaths.',k:'starter sheath drawer value gift',u:U.sets},
      {n:'5-Pc. Knife & Sheath Set',c:'sets',ic:'set',d:'Five top everyday knives with drawer sheaths.',k:'starter sheath drawer value gift',u:U.sets},
      {n:'Kitchen Classics (3-Pc.)',c:'sets',ic:'gift',d:'The three must-have kitchen knives, gift-boxed.',k:'kitchen essential trio wedding gift classics',u:U.gifts},
      {n:'Carving Set',c:'sets',ic:'gift',d:'Carver + fork for the holiday table; a future heirloom.',k:'carving holiday turkey roast gift heirloom',u:U.gifts},
      {n:'Welcome Home Set',c:'sets',ic:'gift',d:'Two essentials — a treasured housewarming gift.',k:'housewarming gift new home essentials welcome',u:U.gifts},
      {n:'Salad Mates',c:'sets',ic:'gift',d:'Two of Cutco’s most popular knives in a gift pairing.',k:'gift duo salad popular everyday',u:U.gifts},
      {n:'Wine & Cheese Set',c:'sets',ic:'gift',d:'A cheese knife and spreader pair — perfect for hosts.',k:'entertaining cheese wine host gift charcuterie',u:U.gifts},
      {n:'Cook’s Combo (Petite Chef + Trimmer)',c:'sets',ic:'gift',d:'Two prep workhorses paired in a gift box.',k:'meal prep duo gift kitchen combo',u:U.gifts}
    ];
    // official Cutco product images (CDN), keyed by product name → SKU code
    var IB='/assets/products/', IS='.jpg';
    var IMG={
      '9-1/4" French Chef':'1725C','7-5/8" Petite Chef':'1728C','7" Santoku':'1766C','5" Petite Santoku':'2166C','Santoku-Style Trimmer':'3721C','Trimmer (Utility Knife)':'1721C','4" Vegetable Knife':'4135C','6" Vegetable Knife':'2135C','7-1/2" Vegetable Knife':'1735C','2-3/4" Paring Knife':'1720C','4" Paring Knife':'2120C','Gourmet Paring Knife':'4120C','Bird’s Beak Paring Knife':'3120C','9" Carver':'1723C','6-3/4" Petite Carver':'1729C','9-3/4" Slicer (Bread Knife)':'1724C','Petite Slicer (Bread Knife)':'2124C','Cleaver':'1737C','Butcher Knife':'1722C','Boning Knife':'1761C','Salmon Knife':'1762C','Hardy Slicer':'3738C','Gourmet Prep Knife':'1738C','Cheese Knife':'1504','Traditional Cheese Knife':'1764C','Spatula Spreader':'1768C',
      'Super Shears':'77C','Vegetable Peeler':'1501','Ice Cream Scoop':'1503','Pizza Cutter':'1502','Can Opener':'1506','Wine Opener':'1507','Knife Sharpener':'84','Mix-Stir':'1714C','Slotted Turner':'1716C','Serving Spoons & Ladle':'1715C','Potato Masher':'1160C','Carving / Turning Fork':'1727C','Cutting Boards':'126','Kitchen Tool Sets (5–6 pc)':'1792C','Slice n’ Serve / Turn n’ Serve':'1754C','Gourmet Fry Pans (8/10/12")':'930','Sauce Pans (1/2/3 Qt)':'992','11-1/2" Skillet & Cover':'990','Dutch Oven (4 / 6.3 Qt)':'995','10 Qt. Stock Pot':'936','Wok & Cover':'939','Steamer / Double Boiler Inserts':'997','Cookware Sets (Aspiring→Complete)':'9901','Stainless Place Settings':'1947','60-Pc. Flatware Set in Chest':'1984','Serving & Hostess Sets':'1971','Individual Flatware':'1950',
      'Table Knife':'1759CSH','Stainless Table Knife':'1959','Steak Knife':'2159CSH','Table Knife Sets (4–12 pc)':'1869C','4-Pc. Steak Knife Set':'2065C','Hunting Knife':'1769C','Gut Hook Hunting Knife':'5717BK','Drop Point Hunting Knife':'5718BK','Clip Point Outdoor Knife':'5719BK','CUTCO/KA-BAR Outdoorsman':'5726','CUTCO/KA-BAR Explorer':'5725','Fisherman’s Solution':'5721BK','Pocket Knife':'1886BK','2-3/4" Lockback Knife':'1891BK','Golf Mate':'1890BK','Homemaker +8 Set with Block':'2018C','Homemaker Set with Block':'2001C','Homemaker Set with Trays':'2000C','Galley + 6 Set with Block':'2008C','Galley Set with Block':'2007C','Gourmet Set with Block':'1805C','Studio Set with Block':'1809C','Essentials Set with Block':'1845C','Kitchenette Set with Tray':'1783C','Space Saver Set with Block':'1847C','Signature Set with Block':'1814C','Ultimate Set with Block':'1813C','The Complete Kitchen Collection':'6815C','3-Pc. Knife & Sheath Set':'2031C','5-Pc. Knife & Sheath Set':'2035C','Kitchen Classics (3-Pc.)':'1827CD','Carving Set':'1834CD','Welcome Home Set':'3826CD','Salad Mates':'1820CD','Wine & Cheese Set':'2130CD','Cook’s Combo (Petite Chef + Trimmer)':'1853CD'
    };
    function imgUrl(name){ var c=IMG[name]; return c?(IB+c+IS):''; }
    // current Cutco prices (USD) — kept fresh by a scheduled refresh
    var PRICE_UPDATED='June 29, 2026';
    var PRICES={
      '9-1/4" French Chef':'$200','7-5/8" Petite Chef':'$183','7" Santoku':'$184','5" Petite Santoku':'$164','Santoku-Style Trimmer':'$104','Trimmer (Utility Knife)':'$98','4" Vegetable Knife':'$153','6" Vegetable Knife':'$174','7-1/2" Vegetable Knife':'$201','2-3/4" Paring Knife':'$85','4" Paring Knife':'$91','Gourmet Paring Knife':'$85','Bird’s Beak Paring Knife':'$91','9" Carver':'$149','6-3/4" Petite Carver':'$142','9-3/4" Slicer (Bread Knife)':'$150','Petite Slicer (Bread Knife)':'$146','Cleaver':'$275','Butcher Knife':'$169','Boning Knife':'$132','Salmon Knife':'$162','Hardy Slicer':'$191','Gourmet Prep Knife':'$191','Cheese Knife':'$98','Traditional Cheese Knife':'$118','Spatula Spreader':'$97',
      'Super Shears':'$149','Vegetable Peeler':'$57','Ice Cream Scoop':'$61','Pizza Cutter':'$73','Can Opener':'$73','Wine Opener':'$67','Knife Sharpener':'$68','Mix-Stir':'$66','Slotted Turner':'$66','Serving Spoons & Ladle':'from $66','Potato Masher':'$81','Carving / Turning Fork':'from $75','Cutting Boards':'from $35','Kitchen Tool Sets (5–6 pc)':'from $354','Slice n’ Serve / Turn n’ Serve':'from $76','Gourmet Fry Pans (8/10/12")':'from $267','Sauce Pans (1/2/3 Qt)':'from $359','11-1/2" Skillet & Cover':'$600','Dutch Oven (4 / 6.3 Qt)':'from $430','10 Qt. Stock Pot':'$792','Wok & Cover':'$800','Steamer / Double Boiler Inserts':'from $222','Cookware Sets (Aspiring→Complete)':'from $1,617','Stainless Place Settings':'from $156','60-Pc. Flatware Set in Chest':'$1,881','Serving & Hostess Sets':'from $181','Individual Flatware':'from $39',
      'Table Knife':'$56','Stainless Table Knife':'$78','Steak Knife':'$98','Table Knife Sets (4–12 pc)':'from $230','4-Pc. Steak Knife Set':'$398',
      'Hunting Knife':'$255','Gut Hook Hunting Knife':'$161','Drop Point Hunting Knife':'$137','Clip Point Outdoor Knife':'$137','CUTCO/KA-BAR Outdoorsman':'$279','CUTCO/KA-BAR Explorer':'$275','Fisherman’s Solution':'$132','Pocket Knife':'$83','2-3/4" Lockback Knife':'$132','Golf Mate':'$81',
      'Homemaker +8 Set with Block':'$1,715','Homemaker Set with Block':'$1,343','Homemaker Set with Trays':'$1,228','Galley + 6 Set with Block':'$1,236','Galley Set with Block':'$945','Gourmet Set with Block':'$1,072','Studio Set with Block':'$567','Essentials Set with Block':'$711','Kitchenette Set with Tray':'$559','Space Saver Set with Block':'$788','Signature Set with Block':'$2,565','Ultimate Set with Block':'$3,519','The Complete Kitchen Collection':'$13,580','3-Pc. Knife & Sheath Set':'$381','5-Pc. Knife & Sheath Set':'$695','Kitchen Classics (3-Pc.)':'$372','Carving Set':'$232','Welcome Home Set':'$228','Salad Mates':'$189','Wine & Cheese Set':'$191','Cook’s Combo (Petite Chef + Trimmer)':'$287'
    };
    var BEST={'9-1/4" French Chef':1,'Trimmer (Utility Knife)':1,'7" Santoku':1,'Table Knife':1,'Homemaker +8 Set with Block':1,'Hunting Knife':1};
    // "when purchased separately" full value (verified on cutco.com) → powers the savings line
    var VALUES={'Homemaker +8 Set with Block':1983,'Homemaker Set with Block':1535,'Homemaker Set with Trays':1403,'Galley + 6 Set with Block':1404,'Galley Set with Block':1068,'Gourmet Set with Block':1218,'Studio Set with Block':630,'Essentials Set with Block':790,'Kitchenette Set with Tray':621,'Space Saver Set with Block':875,'Signature Set with Block':3018,'Ultimate Set with Block':4240,'The Complete Kitchen Collection':16246,'3-Pc. Knife & Sheath Set':410,'5-Pc. Knife & Sheath Set':747,'60-Pc. Flatware Set in Chest':2808,'Cookware Sets (Aspiring→Complete)':1702,'Kitchen Tool Sets (5–6 pc)':402};
    var TABS=[['all','Everything'],['knives','Kitchen Knives'],['table','Table & Steak'],['tools','Tools & Gadgets'],['cookware','Cookware'],['flatware','Flatware'],['outdoors','Outdoors & Hunting'],['sets','Sets & Gifts']];
    var QUICK=[['Best first knife','petite chef'],['Vegetable prep','vegetable'],['Wedding gift','wedding'],['For the griller','steak'],['For the fisherman','fillet'],['Hunting','hunting'],['Cookware','cookware'],['Small kitchen','starter']];
    var curTab='', curQ='', shown=0; var STEP=12;
    var search=document.getElementById('expSearch');
    var selectEl=document.getElementById('expSelect');
    var quickEl=document.getElementById('expQuick');
    var countEl=document.getElementById('expCount');
    // wishlist state
    var list=[]; try{ list=JSON.parse(localStorage.getItem('cutcoList')||'[]'); }catch(e){ list=[]; }
    function save(){ try{ localStorage.setItem('cutcoList', JSON.stringify(list)); }catch(e){} }
    function inList(n){ return list.indexOf(n)>-1; }
    function esc(s){ var d=document.createElement('div'); d.textContent=s==null?'':s; return d.innerHTML; }
    var toastEl;
    function toast(msg){
      if(!toastEl){ toastEl=document.createElement('div'); toastEl.className='toast'; document.body.appendChild(toastEl); }
      toastEl.textContent=msg; toastEl.classList.add('show');
      clearTimeout(toastEl._t); toastEl._t=setTimeout(function(){ toastEl.classList.remove('show'); },1900);
    }
    // ---- price helpers (full price + 5-month interest-free EasyPay) ----
    function parsePrice(s){ if(!s) return null; var from=s.indexOf('from')===0; var m=s.replace(/,/g,'').match(/(\d+(?:\.\d+)?)/); return m?{num:parseFloat(m[1]),from:from}:null; }
    function money(n){ n=Math.round(n*100)/100; var s=(n%1===0)?n.toFixed(0):n.toFixed(2); return '$'+s.replace(/\B(?=(\d{3})+(?!\d))/g,','); }
    function easyPayStr(num,from){ return (from?'from ':'')+money(num/5)+'/mo'; }
    function showEasy(p,num){ return p.c==='sets' || (num>=120); }
    // quick-pick chips set a search
    QUICK.forEach(function(q){ var b=document.createElement('button'); b.textContent=q[0]; b.addEventListener('click',function(){ search.value=q[1]; curQ=q[1].toLowerCase(); selectEl.value=''; curTab=''; shown=STEP; render(); countEl.scrollIntoView({behavior:'smooth',block:'nearest'}); }); quickEl.appendChild(b); });
    selectEl.addEventListener('change',function(){ curTab=selectEl.value; search.value=''; curQ=''; shown=STEP; render(); if(selectEl.value && selectEl.value!=='all') track('cat',selectEl.value); });
    var _searchT;
    search.addEventListener('input',function(){ curQ=search.value.toLowerCase().trim(); if(curQ){ selectEl.value=''; curTab=''; } shown=STEP; render(); clearTimeout(_searchT); if(curQ.length>=3){ _searchT=setTimeout(function(){ track('search',search.value.trim()); },1300); } });
    function matches(p){
      if(curTab && curTab!=='all' && p.c!==curTab) return false;
      if(!curQ) return true;
      var hay=(p.n+' '+p.k+' '+p.c).toLowerCase();
      return curQ.split(/\s+/).every(function(w){ return hay.indexOf(w)>-1; });
    }
    function makeCard(p){
      var added=inList(p.n);
      var isSet=p.c==='sets';
      var card=document.createElement('div'); card.className='pcard'+(isSet?' is-set':'');
      var iu=imgUrl(p.n);
      var pic=iu
        ? '<div class="pic"><img src="'+iu+'" alt="'+esc(p.n)+'" decoding="async" onerror="var pp=this.parentNode;this.remove();var s=pp&&pp.querySelector(\'svg\');if(s)s.style.display=\'\'"><svg viewBox="0 0 24 24" aria-hidden="true" style="display:none">'+(ICONS[p.ic]||ICONS.knife)+'</svg></div>'
        : '<div class="pic"><svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[p.ic]||ICONS.knife)+'</svg></div>';
      var pr=PRICES[p.n], pp=parsePrice(pr);
      var val=VALUES[p.n];
      var valHtml='';
      var priceTxt=pr?(pp?(money(pp.num)+(pp.from?'+':'')):pr):null;
      var priceHtml=(window.PriceStatus
        ? window.PriceStatus.priceBlock(p.n, priceTxt)
        : (priceTxt?('<div class="pprice">'+esc(priceTxt)+'</div><div class="psnap">June 2026 snapshot — confirm current price</div>'):'<div class="pask">Ask Luke to confirm price</div>'));
      var easyHtml=(pp && showEasy(p,pp.num))?('<div class="peasy">Interest-free EasyPay available — ask Luke</div>'):'';
      var badge=BEST[p.n]?'<span class="ptag">★ Bestseller</span>':'';
      var setbadge=isSet?'<span class="settag">✦ Bundle</span>':'';
      card.innerHTML=badge+setbadge+pic+
        '<h4>'+esc(p.n)+'</h4>'+valHtml+priceHtml+easyHtml+'<p class="pdesc">'+esc(p.d)+'</p>'+
        '<div class="pacts"><button type="button" class="addbtn'+(added?' added':'')+'" data-ev="explorer_add_to_list">'+(added?'✓ On your list':'♡ Add to list')+'</button>'+
        '<a class="viewbtn" href="'+p.u+'" target="_blank" rel="noopener" data-ev="official_cutco_link_click">View ↗</a></div>';
      var btn=card.querySelector('.addbtn');
      btn.addEventListener('click',function(){
        if(inList(p.n)){ list.splice(list.indexOf(p.n),1); btn.classList.remove('added'); btn.textContent='♡ Add to list'; }
        else{ list.push(p.n); btn.classList.add('added'); btn.textContent='✓ On your list'; if(navigator.vibrate)navigator.vibrate(12); toast('✓ Added & saved to your list'); track('add',p.n); }
        save(); updateCart();
      });
      var vb=card.querySelector('.viewbtn'); if(vb) vb.addEventListener('click',function(){ track('view',p.n); });
      return card;
    }
    function render(){
      grid.innerHTML='';
      if(!curTab && !curQ){ countEl.textContent=''; grid.innerHTML='<div class="exp-empty">👋 Pick a category from the menu, tap a quick-pick, or search above — the whole 89-piece lineup is in here. Or ask the assistant up top.</div>'; return; }
      var items=P.filter(matches);
      if(!items.length){ countEl.textContent=''; grid.innerHTML='<div class="exp-empty">Hmm, no match for that — try a simpler word like “knife”, “gift”, “fish”, or “cookware”. Or just <a href="sms:+13126594280" style="color:#7dd3fc">text me</a> what you’re after and I’ll find it.</div>'; return; }
      if(!shown) shown=STEP;
      var slice=items.slice(0,shown);
      countEl.textContent='Showing '+slice.length+' of '+items.length+' '+(items.length===1?'piece':'pieces')+(curQ?(' for “'+search.value.trim()+'”'):'');
      slice.forEach(function(p,i){ var c=makeCard(p); c.style.animationDelay=(Math.min(i,14)*32)+'ms'; grid.appendChild(c); });
      if(items.length>shown){
        var more=document.createElement('button'); more.type='button'; more.className='exp-more'; more.textContent='Show more ('+(items.length-shown)+' more)';
        more.addEventListener('click',function(){ shown+=STEP; render(); });
        grid.appendChild(more);
      }
    }
    // wishlist UI
    var fab=document.getElementById('cartFab'), drawer=document.getElementById('cartDrawer'),
        cBody=document.getElementById('cartBody'), cFoot=document.getElementById('cartFoot'), cCnt=document.getElementById('cartCnt');
    function updateCart(){
      cCnt.textContent=list.length;
      cCnt.style.display=list.length?'inline-flex':'none';
      fab.classList.add('show');
      if(drawer.classList.contains('open')) renderDrawer();
      // refresh any visible add buttons
      Array.prototype.forEach.call(grid.querySelectorAll('.pcard'),function(card){
        var name=card.querySelector('h4').textContent, b=card.querySelector('.addbtn'), on=inList(name);
        b.classList.toggle('added',on); b.textContent=on?'✓ On your list':'♡ Add to list';
      });
    }
    function listLink(){ try{ return location.origin+location.pathname+'#list='+encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(list))))); }catch(e){ return location.origin+location.pathname; } }
    function confetti(){
      try{
        var c=document.createElement('canvas'); c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:200'; c.width=innerWidth; c.height=innerHeight; document.body.appendChild(c);
        var ctx=c.getContext('2d'), cols=['#22d3ee','#5eead4','#a855f7','#f472b6','#fbbf24','#34d399'], ps=[];
        for(var i=0;i<130;i++){ ps.push({x:innerWidth/2+(Math.random()-.5)*150,y:innerHeight*.55,vx:(Math.random()-.5)*9,vy:Math.random()*-13-4,g:.36,s:Math.random()*7+4,c:cols[i%cols.length],r:Math.random()*6.28,vr:(Math.random()-.5)*.4}); }
        var t0=Date.now(); (function loop(){ var el=Date.now()-t0; ctx.clearRect(0,0,c.width,c.height); ps.forEach(function(p){ p.vy+=p.g; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6); ctx.restore(); }); if(el<2300) requestAnimationFrame(loop); else c.remove(); })();
      }catch(e){}
    }
    window.cutcoConfetti=confetti;
    function renderDrawer(){
      var hd=drawer.querySelector('.drawer-head h3'); if(hd) hd.textContent='My Cutco list'+(list.length?(' ('+list.length+')'):'');
      if(!list.length){ cBody.innerHTML='<div class="drawer-empty">Your list is empty.<br>Tap “♡ Add to list” on any piece you’re curious about — it saves automatically, then you can send it straight to me. 🙂</div>'; cFoot.innerHTML=''; return; }
      cBody.innerHTML='<div class="saved-note">💾 Saved on this device — it’ll still be here when you come back.</div>'+list.map(function(n){ return '<div class="witem"><span class="wn">'+esc(n)+(PRICES[n]?(' <span class="wp">'+esc(PRICES[n])+'</span>'):'')+'</span><button type="button" class="wrm" data-n="'+esc(n)+'" aria-label="Remove">×</button></div>'; }).join('');
      Array.prototype.forEach.call(cBody.querySelectorAll('.wrm'),function(x){ x.addEventListener('click',function(){ var n=x.getAttribute('data-n'); var i=list.indexOf(n); if(i>-1){ list.splice(i,1); save(); updateCart(); } }); });
      var total=0, anyFrom=false, priced=0;
      list.forEach(function(n){ var pp=parsePrice(PRICES[n]); if(pp){ total+=pp.num; priced++; if(pp.from) anyFrom=true; } });
      var allVerified = list.length>0 && priced===list.length;
      var totalHtml = allVerified
        ? ('<div class="cart-total"><div class="ct-row"><span>Listed snapshot total</span><strong>'+money(total)+(anyFrom?'+':'')+'</strong></div>'+
           '<div class="ct-note">June 2026 snapshot — before tax, shipping, personalization, and current specials. Confirm current pricing with Luke or Cutco.</div>'+
           '<div class="ct-easy">Interest-free EasyPay can split it into monthly payments — ask Luke.</div></div>')
        : ('<div class="cart-total"><div class="ct-row"><span>Some prices need confirmation.</span></div>'+
           '<div class="ct-note">A few items don’t have a listed price yet — text me and I’ll confirm current pricing.</div></div>');
      var fit=''; try{ var qf=JSON.parse(localStorage.getItem('cutcoFit')||'null'); if(qf&&qf.label) fit='Kitchen Fit: '+qf.label+(qf.answers?(' ('+qf.answers+')'):'')+'\n\n'; }catch(e){}
      var raw='Hi Luke! Here’s my Cutco wish list from your site:\n\n'+fit+list.map(function(n,i){ var sku=IMG[n]||''; var pr=PRICES[n]; return (i+1)+'. '+n+(sku?(' ['+sku+']'):'')+(pr?(' — '+pr+' (June 2026 snapshot)'):' — price to confirm'); }).join('\n')+(allVerified?('\n\nListed snapshot total: '+money(total)+(anyFrom?'+':'')+' (before tax/shipping — please confirm current pricing)'):'\n\nSome prices need confirming — can you check?')+'\n\nCan we go over these? I’d love the full demo.';
      var body=encodeURIComponent(raw);
      cFoot.innerHTML=totalHtml+
        '<a class="btn btn-grad" id="textListBtn" style="padding:13px" data-ev="my_list_text_luke" href="sms:+13126594280?&body='+body+'">Text my list to Luke</a>'+
        '<a class="btn btn-ghost" style="padding:13px" href="mailto:Lukehansen01@gmail.com?subject='+encodeURIComponent('My Cutco wish list')+'&body='+body+'">✉️ Email it instead</a>'+
        (navigator.share?'<button type="button" class="btn btn-ghost" id="shareListBtn" style="padding:13px">📤 Share my list</button>':'')+
        '<a class="btn btn-ghost" style="padding:13px" href="https://calendly.com/lukehansen01/30min" target="_blank" rel="noopener">📅 Book the full hour to see them</a>'+
        '<div class="drawer-mini"><button type="button" class="mini-btn" id="copyListBtn">🔗 Copy link</button><button type="button" class="mini-btn danger" id="clearListBtn">🗑 Clear</button></div>';
      var tb=document.getElementById('textListBtn'); if(tb) tb.addEventListener('click',function(){ confetti(); track('send','list of '+list.length); });
      var sb=document.getElementById('shareListBtn'); if(sb) sb.addEventListener('click',function(){ if(navigator.share){ navigator.share({title:'My Cutco list',text:raw,url:listLink()}).then(function(){confetti();}).catch(function(){}); } });
      var cb=document.getElementById('copyListBtn'); if(cb) cb.addEventListener('click',function(){ var link=listLink(); if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(function(){ cb.textContent='✓ Copied!'; setTimeout(function(){cb.textContent='🔗 Copy link';},1800); },function(){ window.prompt('Copy your list link:',link); }); } else { window.prompt('Copy your list link:',link); } });
      var clb=document.getElementById('clearListBtn'); if(clb) clb.addEventListener('click',function(){ if(window.confirm('Clear your whole list?')){ list.length=0; save(); updateCart(); track('ev','my_list_clear'); } });
    }
    function openDrawer(){ drawer.classList.add('open'); renderDrawer(); }
    function closeDrawer(){ drawer.classList.remove('open'); }
    fab.addEventListener('click',openDrawer);
    Array.prototype.forEach.call(drawer.querySelectorAll('[data-close]'),function(el){ el.addEventListener('click',closeDrawer); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDrawer(); });
    // dated price note + per-category counts in the dropdown
    (function(){
      var pn=document.getElementById('priceNote');
      if(pn) pn.innerHTML='Prices shown are <strong>as of June 2026</strong> and are set by Cutco — always confirm the current price on <a href="https://www.cutco.com/products/" target="_blank" rel="noopener">cutco.com</a> via “View ↗”. Set values are the “bought-separately” price. Interest-free <strong>EasyPay</strong> can split it into monthly payments — ask Luke.';
      Array.prototype.forEach.call(selectEl.options,function(o){
        if(!o.value||o.value==='all') return;
        var c=P.filter(function(p){return p.c===o.value;}).length;
        if(c && o.textContent.indexOf('(')===-1) o.textContent=o.textContent+' ('+c+')';
      });
    })();
    // import a shared list from the URL (#list=...)
    (function(){
      try{
        var m=(location.hash||'').match(/list=([^&]+)/);
        if(m){
          var shared=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
          if(Array.isArray(shared)){ shared.forEach(function(n){ if(list.indexOf(n)<0) list.push(n); }); save(); history.replaceState(null,'',location.pathname+location.search); setTimeout(openDrawer,400); }
        }
      }catch(e){}
    })();
    // Show the full catalog on first load (not an empty grid)
    curTab='all'; if(selectEl){ selectEl.value='all'; } shown=STEP;
    render(); updateCart();
    // expose a small API for the AI assistant
    window.CutcoData={ P:P, has:inList, price:function(n){ return PRICES[n]||''; }, add:function(n){ if(!inList(n)){ list.push(n); save(); updateCart(); if(navigator.vibrate)navigator.vibrate(12); toast('✓ Added & saved to your list'); track('add',n); return true; } return false; }, open:openDrawer };
})();
