const fs = require('fs');
const path = require('path');

const BASE_DIR = '/Users/projectx/Desktop/Claude Code Projects/Products Jsons';
const SCRAPED_DIR = path.join(BASE_DIR, 'agents/scraped_data/by_sku');
const OUTPUT_DIR = path.join(BASE_DIR, 'agents/cleaned_data');

const SKUS = [
  'Q2M-GP120M',
  'Q2M-GP250M',
  'Q2M-GPE2P',
  'Q2M-GPYA1000M',
  'Q2M-GPYA500M',
  'Q2M-GWE4040'
];

function cleanMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let lines = raw.split('\n');
  let cleaned = [];
  let inProductContent = false;
  let skipMode = false;
  let foundProductStart = false;

  // Patterns to REMOVE
  const removePatterns = [
    /^\[Skip to/i,
    /^Skip to/i,
    /^\.\.\.\s*$/,
    /^Site navigation/i,
    /^Close$/i,
    /^Cancel$/i,
    /^Menu$/i,
    /^Menu sluiten$/i,
    /^Search$/i,
    /^Search\s*$/i,
    /^\*\s*$/,
    /^\*\*\s*$/,
    /^-\s*$/,
    /^\|\s*$/,
    /^icon-chevron\s*$/i,
    /^Toggle menu$/i,
    /^Powered by Shopify/i,
    /^Powered by/i,
    /^Copyright \d{4}/i,
    /^2026 /i,
    /^2025 /i,
    /^2024 /i,
    /^\d{4} Three60 Ltd/i,
    /^\d{4} \[Autojoy/i,
    /^Evolution$/,
    /^Currency$/i,
    /^## Currency$/i,
    /^## Language$/i,
    /^Language$/i,
    /^Down$/i,
    /^LeftRight$/i,
    /^EnglishDown$/i,
    /^English$/i,
    /^Eesti$/i,
    /^\[Eesti\]/i,
    /^\[English\]/i,
    /^Select Currency/i,
    /^Choose your country/i,
    /^Select\/Deselect all/i,
    /^Apply$/i,
    /^Reject$/i,
    /^Configuration$/i,
    /^Accept all$/i,
    /^Accept$/i,
    /^Decline$/i,
    /^Data privacy settings/i,
    /^How we use cookies/i,
    /^The settings you specify/i,
    /^Would you like to see/i,
    /^Cookie policy/i,
    /^Use this bar to show/i,
    /^\[Imprint\]/i,
    /^\[Privacy\]/i,
    /^American Express$/i,
    /^Apple Pay$/i,
    /^Diners Club$/i,
    /^Discover$/i,
    /^Google Pay$/i,
    /^JCB$/i,
    /^Mastercard$/i,
    /^Visa$/i,
    /^Klarna$/i,
    /^Maestro$/i,
    /^Shop Pay$/i,
    /^Union Pay$/i,
    /^Your payment information/i,
    /^## Payment & Security/i,
    /^## Newsletter/i,
    /^###### Newsletter/i,
    /^## Sign up and save/i,
    /^Sign up for exclusive/i,
    /^Sign up to our mailing/i,
    /^Subscribe$/i,
    /^Sign up$/i,
    /^Unlock exclusive discounts/i,
    /^Get the latest offers/i,
    /^Your email$/i,
    /^Email$/i,
    /^###### Quick links/i,
    /^###### Our Mission/i,
    /^To offer premium car care/i,
    /^###### Free delivery/i,
    /^###### Clients trust us/i,
    /^###### Europe shipping/i,
    /^###### Various payment/i,
    /^FREE SHIPPING/i,
    /^Free Shipping/i,
    /^Gratis verzending/i,
    /^Premium bezorgopties/i,
    /^Makkelijk betalen/i,
    /^\[FREE DELIVERY/i,
    /^Spend \S+\s+more and get/i,
    /^Your shopping basket is empty/i,
    /^Your cart is currently empty/i,
    /^Your cart is empty/i,
    /^Subtotal$/i,
    /^\$0\.00$/i,
    /^Check out$/i,
    /^Shipping, taxes, and discount/i,
    /^Cart$/i,
    /^\[Start shopping\]/i,
    /^Save$/i,
    /^Add order note$/i,
    /^Add to cart$/i,
    /^Add to basket$/i,
    /^Add to Cart$/i,
    /^In winkelwagen$/i,
    /^\[Add to Cart/i,
    /^Notify me$/i,
    /^Continue Shopping$/i,
    /^Loading\.\.\./i,
    /^Loading image/i,
    /^"Close \(esc\)"/i,
    /^\\?"Close/i,
    /^Open media \d/i,
    /^Load image \d/i,
    /^Roll over image/i,
    /^Click on image/i,
    /^Click to Zoom/i,
    /^Zoom$/i,
    /^Previous$/i,
    /^Next$/i,
    /^Vergroot$/i,
    /^grant consent$/i,
    /^\[Annuleren\]/i,
    /^Verzenden$/i,
    /^Type your search/i,
    /^Clear$/i,
    /^\[Search\]/i,
    /^Decrease quantity/i,
    /^Increase quantity/i,
    /^Quantity$/i,
    /^Quantity:$/i,
    /^\+$/,
    /^This item is a recurring/i,
    /^Couldn't load pickup/i,
    /^Refresh$/i,
    /^Login \/ Signup/i,
    /^Login$/i,
    /^Register$/i,
    /^\[Login\]/i,
    /^\[Register\]/i,
    /^\[Inloggen\]/i,
    /^Inloggen$/i,
    /^\[My account\]/i,
    /^My account$/i,
    /^Mijn account$/i,
    /^CARZILLA$/i,
    /^Productcategorieën$/i,
    /^Terug$/i,
    /^Toon alleen reviews/i,
    /^Gesorteerd op$/i,
    /^Meest recent$/i,
    /^Hoogst beoordeeld$/i,
    /^Laagst beoordeeld$/i,
    /^Could not translate review/i,
    /^Toon reviews$/i,
    /^Schrijf een review$/i,
    /^Schijf je review$/i,
    /^Weergavenaam$/i,
    /^Je e-mailadres$/i,
    /^Jouw mening samengevat$/i,
    /^Voer minstens/i,
    /^Jouw review$/i,
    /^5 sterren$/i,
    /^4 sterren$/i,
    /^3 sterren$/i,
    /^2 sterren$/i,
    /^1 ster$/i,
    /^Write a review$/i,
    /^Write the first review/i,
    /^Gedeeld op de socials/i,
    /^## Onze #CleanRiders/i,
    /^\[Productgalerij overslaan\]/i,
    /^\[Afbeeldingengalerij overslaan\]/i,
    /^\* Ask about this product/i,
    /^Add to Compare/i,
    /^Add to Wish List/i,
    /^Compare this Product/i,
    /^Ask Question/i,
    /^\[Ask Question/i,
    /^Quickview$/i,
    /^\*\*Click to Zoom\*\*/i,
    /^Website designed and developed/i,
    /^Om alle functies/i,
    /^Dé speciaalzaak/i,
    /^Groot en ruim/i,
    /^Persoonlijk advies/i,
    /^Vóór 21:00/i,
    /^This item is not available/i,
    /^components are loading/i,
    /^x$/,
    /^\[FREE SHIPPING/i,
    /^Choose tax zone/i,
    /^incl\. 19% VAT/i,
    /^plus$/i,
    /^Available immediately$/i,
    /^Delivery time:/i,
    /^✔$/,
    /^-->\s*$/,
    /^\[\\?$/,
    /^\\?$/,
    /^\[\s*$/,
    /^\]\s*$/,
    /^Filters\s*$/i,
    /^Sort Most Recent/i,
    /^\d+ reviews$/i,
    /^\*\*\d+\*\*\s*beoordelingen$/i,
    /^Read More$/i,
    /^Was this helpful/i,
    /^\[Continue Shopping\]/i,
    /^We will contact you/i,
    /^We were unable to add/i,
    /^You most likely already/i,
    /^Do you want to be emailed/i,
    /^Please check the email/i,
    /^Enter your email address/i,
    /^You must \[login\]/i,
    /^Share your thoughts/i,
    /^There aren't any reviews/i,
    /^There are no reviews yet/i,
    /^Review this product/i,
    /^\[Write a Review/i,
    /^## Write a Product Review/i,
    /^### Thank You$/i,
    /^### We were unable/i,
    /^### Do you want/i,
  ];

  // Patterns indicating navigation/footer sections to skip entirely
  const skipSectionStartPatterns = [
    /^### Net Orders Checkout/i,
    /^### Shipping Address/i,
    /^### Shipping Methods/i,
    /^## Currency$/i,
    /^## Language$/i,
    /^#### Main menu$/i,
    /^#### Recent searches$/i,
    /^Search our store$/i,
  ];

  // Country/state list patterns
  const countryStatePatterns = [
    /^United States$/i,
    /^Afghanistan$/i,
    /^Albania$/i,
    /^Algeria$/i,
    /^Australia$/i,
    /^Austria$/i,
    /^Belgium$/i,
    /^Bulgaria$/i,
    /^Canada$/i,
    /^China$/i,
    /^Czech Republic$/i,
    /^Denmark$/i,
    /^Estonia$/i,
    /^Finland$/i,
    /^France$/i,
    /^Germany$/i,
    /^Greece$/i,
    /^Hungary$/i,
    /^Ireland$/i,
    /^Italy$/i,
    /^Japan$/i,
    /^Latvia$/i,
    /^Lithuania$/i,
    /^Netherlands$/i,
    /^Poland$/i,
    /^Portugal$/i,
    /^Romania$/i,
    /^Russia$/i,
    /^Slovakia$/i,
    /^Slovenia$/i,
    /^Spain$/i,
    /^Sweden$/i,
    /^Switzerland$/i,
    /^Turkey$/i,
    /^Others$/i,
    /^Alabama/i,
    /^Alaska/i,
    /^Arizona/i,
    /^---$/,
  ];

  // Navigation link patterns
  const navLinkPatterns = [
    /^\[\s*\n?(Wash|Clean|Paint|Protect|Interior|Tires|Towels|DIY|Kits|Brands|Contact|Home|Catalog)\b/i,
    /^\[\s*\n?(Exterior|Accessories|Polishers|Marine|Pressure|Covers|Gift|On Sale|New In|Best Sellers)\b/i,
    /^\[\s*\n?(By Brand|SHOP BY|WASHING|PREPARATION|POLISHING|PROTECTION|WHEELS|MICROFIBRE|SPECIALIST|MISCELLANEOUS)\b/i,
    /^\[\s*\n?(NEW PRODUCTS|NEWS|LOCATIONS|SPECIAL OFFERS)\b/i,
    /^\[\s*\n?(Snow Foam|Pre Wash|Car Shampoo|Wash Mitts|Bug|Clay Bar|Iron Fallout|Water Spot)\b/i,
    /^\[\s*\n?(Ceramic|Wheel|Glass|Trim|Leather|Carpet|Air Freshener|Vacuum|Dashboard)\b/i,
    /^\[\s*\n?(Machine|Pads|Polish|Compound|Scratch|Glaze|All In One|Sealant|Wax)\b/i,
    /^\[\s*\n?(Microfibre|Applicator|Spray Bottle|Storage|LED|Belt|Glove|Seat|Squeegee)\b/i,
    /^\[\s*\n?(Account|Login|Register|Search|Cart|Wishlist|Verlanglijst)\b/i,
    /^\[\s*(303|ACTIVE|AUTOBRITE|AUTOGLYM|AUTOSOL|AVA|BILT HAMBER|BLO|CAR CARE|CLAY MAGIC)\b/i,
    /^\[\s*(COLLINITE|DAYTONA|DODO|DR\.|DURAGLOSS|ETHOS|GRIT|GTECHNIQ|GYEON|IK)\b/i,
    /^\[\s*(KOCH|LAKE|LEATHERIQUE|LILLY|MENZERNA|METROVAC|MINT|NANOLEX|NEXTZETT|NUMATIC)\b/i,
    /^\[\s*(P&S|PLATINUM|RUPES|SCANGRIP|SIA|SONAX|SPECIALITY|STJARNAGLOSS|STONER|THE RAG)\b/i,
    /^\[\s*(VIKAN|XPEL|Auto Finesse|AUTOJOY|BLEND|CARPRO|Foliatec|Gtechniq|IK Sprayers|Tokya)\b/i,
    /^\[\s*(3D Car Care|3M products|Active|ALCHEMY|Angel Wax|Autoglym|Bilt Hamber|BLO Car|Bouncers)\b/i,
    /^\[\s*(CarPro|Chemical Guys|CLEAN\. By|CleanYourCar|Collinite|Carbon Collective|DAS-6)\b/i,
    /^\[\s*(DIY Detail|Dodo Juice|Dr Leather|EZ Detail|Eurow|Finishkare|Flexipads|FLEX)\b/i,
    /^\[\s*(Garage Therapy|Gliptone|GYEON|Gtechniq|Lake Country|Infinity Wax|Koch-Chemie)\b/i,
    /^\[\s*(Kranzle|Mammoth|Meguiars|Maxshine|Mcrofbre|Menzerna|Poorboy|Purestar|R222)\b/i,
    /^\[\s*(RUPES|Scangrip|Optimum|Scholl|ShineMate|Soft 99|Sonax|Stjarnagloss|Stoner)\b/i,
    /^\[\s*(Tuf Shine|Ultima|Vikan|Vertool|Wheel Woolies|Valet Pro|Zaino|Zymol|Zvizzer)\b/i,
    /^\[\s*Exterieur\b/i,
    /^\[\s*Interieur\b/i,
    /^\[\s*Apparaten\b/i,
    /^\[\s*Accessoires\b/i,
    /^\[\s*Sets\b/i,
    /^\[\s*Cadeaukaarten\b/i,
    /^\[\s*Nieuw\b/i,
    /^\[\s*Aanbiedingen\b/i,
    /^\[\s*Laatste kans\b/i,
    /^\[\s*Merken\b/i,
    /^\[\s*Blogs\b/i,
    /^\[\s*Afleveringen\b/i,
  ];

  // Brand nav patterns for gyeon.co
  const gyeonNavPatterns = [
    /^\[\s*\n?(Home Page|About Gyeon|Products|Experience Center|Partnerships|Network|Contact Us|Regional websites)\b/i,
    /^\[\s*\n?(News & Events|About Us|The ICON|Certified Detailer|FAQ)\b/i,
    /^\[\s*\n?(STEP 1|STEP 2|STEP 3)\b/i,
    /^\[\s*\n?(Fabrics|Glass|Leather|Paint|Trim|Wheels|PPF|Maintenance|Gelcoat|Wood)\b/i,
    /^\[\s*\n?(Q2 CERAMIC|Q2M Maintenance|Q2M Accessories|PPF Paint Protection|Purify Collection)\b/i,
    /^\[\s*\n?(SEE ALL PRODUCTS|Q2R Yachts)\b/i,
    /^\[\s*\n?(Europe|South East Asia)\b/i,
    /^\[\s*\n?(Gyeon Global|Australia|Japan|Oman|Singapore|South Korea|Vietnam)\b/i,
    /^\[\s*\n?(Belgium|Italy|Netherlands|Poland|Portugal|Russia|Spain|Switzerland|Turkey|United Kingdom|France)\b/i,
    /^\[\s*\n?(USA|Mexico|Brazil)\b/i,
    /^Automotive\s*$/i,
    /^YACHTS & aircraft\s*$/i,
    /^### AUTOMOTIVE PRODUCTS$/i,
    /^### YACHTS & aircraft PRODUCTS$/i,
    /^EXPLORE COLLECTIONS:$/i,
    /^Gyeon Global$/i,
    /^Country Websites$/i,
    /^Australia and Oceania$/i,
    /^Asia$/i,
    /^Europe$/i,
    /^North America$/i,
    /^South America$/i,
  ];

  // theultimatefinish.co.uk specific nav
  const tufNavPatterns = [
    /^\[\s*\n?(By Brand|Best Sellers|New In|Exterior|Interior|Accessories|Polishers|Marine|Pressure Washers|Paint Protection Film|Covers|Kits|Gift Vouchers)\b/i,
    /^\[\s*\n?(All Exterior|All Interior|All Accessories|All Polishers|All Marine|All Pressure|All Covers|All Kits|All Gift|All By Brand|All Best|All New)\b/i,
    /^\[\s*\n?(Exterior Cleaning|Wheels Cleaners|Glass|Drying|Polish|Paint Protection|Panel Wipes|Quick Detailers|Trim Restorers|Metal|Soft Top|Headlight|Engine|Stone|Matte)\b/i,
    /^\[\s*\n?(Interior Cleaning|Air Fresheners|Vacuum|Interior Accessories|Carpet|Leather|Protectors)\b/i,
    /^\[\s*\n?(Wash|Brushes|Cloths|Applicator|Spray Bottles|Storage|LED|Interior|Belts|Gloves|Kneeling|Seats|Squeegee|Vacuum|Polishing|Dust)\b/i,
    /^\[\s*\n?(Machines|Pads|Polishes|Tools|Heavy Cut|Medium Cut|Finishing|Microfibre|Wool|Abrasive|Dual Action|Rotary|Cordless|Direct|Backing|Flexible|Gloss|Paint Depth)\b/i,
    /^\[\s*\n?(Outdoor|Indoor|Tailored|Audi|BMW|Ferrari|Mercedes|Porsche|Silks|Cover|Battery)\b/i,
    /^\[\s*\n?(Exterior Kits|Interior Kits|All Kits)\b/i,
    /^\[\s*\n?(Snow Foam|Pre Wash|Shampoo|Buckets|Mitts|Pads|Sponges|Traffic|Degreasers|APC|Bug|Glue|Iron|Clay|Water Spot|Bird|Waterless)\b/i,
    /^\[\s*\n?(Alloy|Coating|Wheel Brushes|Tyre Dressing|Tyre Cleaners)\b/i,
    /^\[\s*\n?(Cleaner|Polish|Sealants|Screenwash)\b/i,
    /^\[\s*\n?(Microfibre Drying|Blowers|Rinse|Water Filter)\b/i,
    /^\[\s*\n?(Scratch|Glazes|All In One|Ceramic Coating|Waxes|Synthetic)\b/i,
    /^\[\s*\n?(Rubber|Plastic|Vinyl|Metal Polish|Metal Sealants|Rust|Convertible)\b/i,
    /^\[\s*\n?(Dashboard|Door|Cleaners|Protection|Repair|Kits|Alcantara|Spot|Swabs|Magic)\b/i,
    /^\[\s*\n?(Foamers|Trigger|Pump|Bags|Trolley|Wall|Hoses|Foam Cannons|Extensions|Patio|Nozzles|Adapters|Bottles|Wheels|Portable|Industrial|WashR)\b/i,
    /^Account$|^Login$|^Register$|^Rewards Scheme|^Trade Accounts|^Delivery$|^Contact Us$|^Sales & Support/i,
    /^\[Login\]|^\[Rewards\]|^\[Trade\]|^\[Delivery\]|^\[Contact\]|^\[Sales/i,
    /^Select Currency/i,
  ];

  // cleanyourcar.co.uk specific patterns
  const cycNavPatterns = [
    /^\[\s*\n?(New In|Brands|Exterior|Interior|Paint Correction|Ceramic|Tools|Accessories|On Sale)\b/i,
    /^Brand:\s*\[/i,
  ];

  // Social media links
  const socialPatterns = [
    /^\[\s*\n?(Facebook|Youtube|Instagram|TikTok|Twitter|LinkedIn)\b/i,
    /^\[\s*\n?(facebook|youtube|instagram|tiktok|twitter|linkedin)\b/i,
    /^\[YouTube\]\(https/i,
    /^\[TikTok\]\(https/i,
    /^\[Instagram\]\(https/i,
    /^\[Facebook\]\(https/i,
  ];

  // Footer links
  const footerLinkPatterns = [
    /^\[\s*\n?(Search|Terms and Conditions|Privacy Policy|Shipping|Become a Point|Our Resellers|Our Detailers|Used cars)\b/i,
    /^\[\s*\n?(Privacy Policy|Usage Terms|Terms of Service)\b/i,
    /^\[\s*\n?(Contact Us|Gift Vouchers|Wishlist)\b/i,
    /^\[Trustpilot\]/i,
  ];

  // Image-only lines with no useful context (logo images, payment icons, tracking pixels etc)
  const logoImagePatterns = [
    /^!\[image\]\(https:\/\/gyeon\.co\/wp-content\/uploads\/2020\/(03|05)\/gyeon_logo/i,
    /^!\[image\]\(https:\/\/gyeon\.co\/wp-content\/uploads\/2021\/01\/menu_background/i,
    /^!\[image\]\(https:\/\/gyeon\.co\/wp-content\/uploads\/2018\/11\/background_tab/i,
    /^!\[image\]\(https:\/\/www\.facebook\.com\/tr\?/i,
    /^!\[image\]\(https:\/\/www\.googleadservices\.com/i,
    /^!\[image\]\(image\/cache\/wp\/gp\/manufacturer\//i,
    /^!\[image\]\(image\/cache\/wp\/gp\/logo/i,
    /^!\[image\]\(\/images\/zero-stars/i,
    /^!\[image\]\(\/DynamicImages/i,
  ];

  let skipUntilProduct = true; // Skip everything until product content starts
  let skipSection = false;
  let emptyLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines (track count to allow max 1 consecutive)
    if (line === '' || line === '-' || line === '- ' || line === '*' || line === '**' || line === '|') {
      emptyLineCount++;
      if (emptyLineCount <= 1 && foundProductStart) {
        cleaned.push('');
      }
      continue;
    }
    emptyLineCount = 0;

    // Check if we should skip this section entirely
    if (skipSectionStartPatterns.some(p => p.test(line))) {
      skipSection = true;
      continue;
    }

    // Check for product content start markers
    if (!foundProductStart) {
      // Look for product title (h1 or h2 with product name)
      if (/^#\s+/.test(line) && !/##+/.test(line.substring(0, 3))) {
        // h1 heading - likely product title
        if (/glass|polish|wipe|pack|odor|plus/i.test(line)) {
          foundProductStart = true;
          skipSection = false;
          skipUntilProduct = false;
        }
      }
      // Also check for SKU or price lines near product
      if (/^(SKU|Brand|Product code|Art\. nr|€|£|\$|Price|Sale price|Regular price)/i.test(line)) {
        foundProductStart = true;
        skipSection = false;
        skipUntilProduct = false;
      }
      // gyeon.co multi-line product heading: "# Q" followed by "2" then "M" then "GLASSPOLISH" etc
      if (/^# Q\s*$/i.test(line)) {
        foundProductStart = true;
        skipSection = false;
        skipUntilProduct = false;
      }
      // gyeon.co headings like "## Exterior / maintenance" or "## Interior / Accessories"
      if (/^## (Exterior|Interior)\s*\/\s*(maintenance|Accessories)/i.test(line)) {
        foundProductStart = true;
        skipSection = false;
        skipUntilProduct = false;
      }
      // gyeon.co description starts: "### Dedicated polish" or "### Glass cleaning essentials"
      if (/^### (Dedicated|Glass cleaning|Enhanced)/i.test(line)) {
        foundProductStart = true;
        skipSection = false;
        skipUntilProduct = false;
      }
    }

    if (skipUntilProduct && !foundProductStart) continue;
    if (skipSection) {
      // Check if section ends (new heading or product content)
      if (/^#{1,3}\s+/.test(line) && !/^#{1,3}\s+(Shipping|Currency|Language|Main menu|Recent|Net Orders)/i.test(line)) {
        skipSection = false;
      } else {
        continue;
      }
    }

    // Apply remove patterns
    if (removePatterns.some(p => p.test(line))) continue;
    if (countryStatePatterns.some(p => p.test(line))) continue;
    if (navLinkPatterns.some(p => p.test(line))) continue;
    if (gyeonNavPatterns.some(p => p.test(line))) continue;
    if (tufNavPatterns.some(p => p.test(line))) continue;
    if (cycNavPatterns.some(p => p.test(line))) continue;
    if (socialPatterns.some(p => p.test(line))) continue;
    if (footerLinkPatterns.some(p => p.test(line))) continue;
    if (logoImagePatterns.some(p => p.test(line))) continue;

    // Skip Shopify JSON variant data
    if (/^\[\{\"id\":\d+,\"title\":/.test(line)) continue;

    // Skip cleanyourcar.co.uk leaked nav links (brand names ending with ] or ](url))
    if (/^\]\(https:\/\/www\.cleanyourcar\.co\.uk\//.test(line)) continue;
    if (/^\]\(https:\/\/carzilla\.ca\/collections\//.test(line)) continue;
    if (/^\]\(https:\/\/www\.carclean\.com\//.test(line)) continue;
    if (/^\]\(javascript:/.test(line)) continue;
    if (/^\]\(#\)$/.test(line)) continue;
    if (/^\]\(\/#?\)$/.test(line)) continue;
    // Skip stand-alone nav labels followed by ](url) on next line
    if (/^(Washing|Drying|Polishing|Cleaning|Protection|Wheels|Tyres|Engine|Glass|Metal|Headlight|Convertible|Matte|Interior|Carpet|Fabrics|Leather|Vinyl|Tools|Accessories|On Sale|New In)(\s*&\s*\w+)?$/i.test(line) && !foundProductStart) continue;

    // Skip lines that are just a bare ](url) link closure
    if (/^\]\(/.test(line)) continue;

    // Skip lines that look like store UI noise
    if (/^0\s*item\(s\)/i.test(line)) continue;
    if (/^0\s*$/i.test(line)) continue;
    if (/^£\s*$/i.test(line)) continue;
    if (/^€\s*$/i.test(line)) continue;
    if (/^\$\s*$/i.test(line)) continue;
    if (/^DK$/i.test(line)) continue;
    if (/^SK$/i.test(line)) continue;
    if (/^GBP$/i.test(line)) continue;
    if (/^EUR$/i.test(line)) continue;
    if (/^CAD$/i.test(line)) continue;
    if (/^USD$/i.test(line)) continue;
    if (/^Pound Sterling$/i.test(line)) continue;
    if (/^Danish Krone$/i.test(line)) continue;
    if (/^Swedish Krona$/i.test(line)) continue;
    if (/^Euro$/i.test(line)) continue;
    if (/^Sign Up & Save$/i.test(line)) continue;
    if (/^Trade Accounts$/i.test(line)) continue;
    if (/^Wishlist\d*$/i.test(line)) continue;
    if (/^Read Reviews \| Ask a question$/i.test(line)) continue;
    if (/^Qty$/i.test(line)) continue;
    if (/^Ex VAT:/i.test(line)) continue;
    if (/^From:/i.test(line)) continue;
    if (/^Meer info\.$/i.test(line)) continue;
    if (/^Uitgelogd$/i.test(line)) continue;
    if (/^Je loopt/i.test(line)) continue;
    if (/^poetspunten mis/i.test(line)) continue;
    if (/^Op voorraad$/i.test(line)) continue;
    if (/^Niet op voorraad$/i.test(line)) continue;
    if (/^Annuleren$/i.test(line)) continue;
    if (/^Wat vinden jullie\.$/i.test(line)) continue;

    // Skip form field patterns
    if (/^Your Name$/i.test(line)) continue;
    if (/^E-Mail Address$/i.test(line)) continue;
    if (/^Message$/i.test(line)) continue;
    if (/^#### Have a question\?$/i.test(line)) continue;

    // Skip breadcrumb lines
    if (/^\[Home\]\(\/#?\)\s*>\s*\[/.test(line)) continue;
    if (/^\[Home\]\(\/#?\)$/.test(line)) continue;

    // Skip store promo banners and footer content
    if (/^Free UK Delivery|^Order by 5pm|^Detailing Tips/i.test(line)) continue;
    if (/^\[\s*\n?Free UK Delivery/i.test(line)) continue;
    if (/^\[\s*\n?Order by 5pm/i.test(line)) continue;
    if (/^\[\s*\n?Detailing Tips/i.test(line)) continue;

    // Skip "3%+ Discount" promo lines
    if (/^3%\+ Discount/i.test(line)) continue;
    if (/^\*\*3%\+ Discount/i.test(line)) continue;

    // Skip various UI text
    if (/^Selected Size:/i.test(line)) continue;
    if (/^✅ You Save:/i.test(line)) continue;
    if (/^Valid until:/i.test(line)) continue;
    if (/^\*\*In Stock$/i.test(line)) continue;
    if (/^\*\*Add to basket/i.test(line)) continue;
    if (/^\.\.\. ?or notify me/i.test(line)) continue;
    if (/^Tax included/i.test(line)) continue;
    if (/^\[Shipping\]/i.test(line)) continue;
    if (/^calculated at checkout/i.test(line)) continue;
    if (/^Shipping\]\(\/policies/i.test(line)) continue;
    if (/^Product variants$/i.test(line)) continue;
    if (/^Default Title/i.test(line)) continue;

    // Skip long lists of states
    if (/^AlabamaAlaska/i.test(line)) continue;

    // Skip standalone country name links like [\nBelgium (EUR €)\n](#)
    if (/^\[\s*\n?[A-Z][a-z]+ \(EUR/i.test(line)) continue;
    if (/^\[\s*\n?(CAD|USD|GBP|EUR|DKK|SEK)\s*\n?\]/i.test(line)) continue;

    // Skip "Couldn't load" messages
    if (/^Couldn't load/i.test(line)) continue;

    // Skip navigation image blocks for cleanyourcar
    if (/^\[\s*\n?\*\s*\n?\]/i.test(line)) continue;

    // Skip Google/SVG icon debris
    if (/^\" x=\"\d/.test(line)) continue;
    if (/^\" y=\"\d/.test(line)) continue;

    // Skip tracking pixel images
    if (/^!\[image\]\(https:\/\/www\.(facebook|google)/i.test(line)) continue;

    // Skip \r sequences
    if (/^\\r\\n/.test(line) || line === '\\r' || line === '\\n') continue;

    // Clean up excessive \r\n
    line = line.replace(/\r\n/g, '\n').replace(/\r/g, '');

    // Skip lines that are just dashes or bullets with no content
    if (/^[-*]\s*$/.test(line)) continue;

    cleaned.push(line);
  }

  // Join and clean up
  let result = cleaned.join('\n');

  // Remove multiple consecutive blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Trim
  result = result.trim();

  return result;
}

function processSKU(sku) {
  const skuDir = path.join(SCRAPED_DIR, sku);
  const mergedPath = path.join(skuDir, '_scraped_merged.json');

  if (!fs.existsSync(mergedPath)) {
    console.error(`Missing merged file for ${sku}`);
    return;
  }

  const merged = JSON.parse(fs.readFileSync(mergedPath, 'utf8'));
  const sources = [];

  for (const source of merged.sources) {
    const urlIndex = merged.sources.indexOf(source);
    const domain = source.domain;
    const sourceFile = path.join(skuDir, `url_${urlIndex}_${domain}.json`);

    if (!fs.existsSync(sourceFile)) {
      console.warn(`  Missing source file: url_${urlIndex}_${domain}.json`);
      continue;
    }

    const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    const rawMarkdown = sourceData.content?.raw_markdown || '';

    if (!rawMarkdown.trim()) {
      console.warn(`  Empty content for url_${urlIndex}_${domain}.json`);
      continue;
    }

    const cleanedContent = cleanMarkdown(rawMarkdown);

    if (!cleanedContent.trim()) {
      console.warn(`  Cleaned content is empty for url_${urlIndex}_${domain}.json`);
      continue;
    }

    sources.push({
      url: source.url,
      domain: source.domain,
      language: source.language,
      page_title: source.page_title,
      cleaned_content: cleanedContent
    });
  }

  const output = {
    sku: merged.sku,
    product_name: merged.product_name,
    barcode: merged.barcode,
    total_sources: sources.length,
    cleaned_at: new Date().toISOString(),
    sources: sources
  };

  const outputPath = path.join(OUTPUT_DIR, `${sku}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${outputPath} (${sources.length} sources)`);
}

// Process all SKUs
for (const sku of SKUS) {
  console.log(`Processing ${sku}...`);
  processSKU(sku);
}

console.log('Done!');
