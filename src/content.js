export const IS_PRODUCTION_EDITION = import.meta.env.VITE_EDITION === "production";
export const PRODUCT_NAME = IS_PRODUCTION_EDITION ? "iPhone 18 Fold" : "Fold concept device";
export const PRODUCT_NAME_ZH = IS_PRODUCTION_EDITION ? "iPhone 18 Fold" : "概念折叠设备";
export const TARGET_USDT = 2899;
export const PRODUCT_IMAGES = IS_PRODUCTION_EDITION
  ? { unfolded: "/assets/iphone-fold-unfolded-v3.png", folded: "/assets/iphone-fold-folded-v3.png" }
  : { unfolded: "/assets/fold-concept-unfolded-neutral-v1.png", folded: "/assets/fold-concept-folded-neutral-v1.png" };

export const STORAGE_KEY = "brand-my-fold-auction-v5";
export const VISITOR_KEY = "brand-my-fold-visitors-v3";
export const WAITLIST_KEY = "brand-my-fold-waitlist-v3";
export const LANGUAGE_KEY = "brand-my-fold-language-v1";
export const CHANNEL_NAME = "brand-my-fold-live-v4";
export const USGS_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const spotNames = [
  ["Upper left", "左上位"], ["Marquee", "主视觉位"], ["Upper right", "右上位"],
  ["Middle left", "中部左侧"], ["Inner left", "内侧左位"], ["Inner right", "内侧右位"], ["Middle right", "中部右侧"],
  ["Bottom left", "底部左侧位"], ["Bottom center", "底部中间位"], ["Bottom right", "底部右侧位"],
];

const positions = {
  unfolded: [[15.5,28.5,10.2,12.5],[26.2,28.5,12.7,12.5],[39.4,28.5,10,12.5],[15.5,44.5,6.7,10.8],[22.8,44.5,5.5,10.8],[36.3,44.5,5.5,10.8],[42.4,44.5,7,10.8],[15.5,63,10.2,13.5],[26.2,63,12.7,13.5],[39.4,63,10,13.5]],
  folded: [[28.1,29,8.8,12.7],[37.5,29,9.5,12.7],[47.5,29,8.2,12.7],[28.1,44.5,5.7,10.7],[34.4,44.5,5,10.7],[44.2,44.5,5,10.7],[49.8,44.5,5.9,10.7],[28.1,62.5,8.8,13.2],[37.5,62.5,9.5,13.2],[47.5,62.5,8.2,13.2]],
};

const startingPrices = [400, 400, 400, 125, 125, 125, 125, 200, 200, 200];
const showcaseBrands = [
  ["Stripe", "stripe", "635BFF"], ["Figma", "figma", "F24E1E"], ["Notion", "notion", "111111"],
  ["Vercel", "vercel", "111111"], ["Linear", "linear", "5E6AD2"], ["Supabase", "supabase", "3FCF8E"],
  ["Framer", "framer", "0055FF"], ["Cloudflare", "cloudflare", "F38020"], ["GitHub", "github", "181717"], ["Raycast", "raycast", "FF6363"],
];

export const seedSpots = startingPrices.map((amount, index) => {
  const row = index < 3 ? "top" : index < 7 ? "middle" : "bottom";
  const [previewBrand, previewIcon, previewColor] = showcaseBrands[index];
  return {
    id: index + 1,
    name: spotNames[index][0],
    nameZh: spotNames[index][1],
    coordinate: `S${index + 1}`,
    size: row === "top" ? "L" : row === "middle" ? "S" : "M",
    dimensions: row === "top" ? "3.2 × 1.4 cm" : row === "middle" ? "1.8 × 1.2 cm" : "3.2 × 1.5 cm",
    brand: "",
    url: "",
    amount,
    bids: 0,
    color: "1d1d1f",
    previewBrand,
    previewIcon,
    previewColor,
    positions: { unfolded: positions.unfolded[index], folded: positions.folded[index] },
  };
});

const productEn = PRODUCT_NAME;
const productZh = PRODUCT_NAME_ZH;

export const COPY = {
  en: {
    nav: { auction: "Live auction", how: "How it works", device: "What it funds", faq: "FAQ", cta: "Choose a spot" },
    hero: {
      visitors: "visits", title: "Your brand, on my Fold.", subtitle: `Ten measured placements on the camera-side shell of my future ${productEn}.`,
      raised: "in leading bids", starting: "starting price", goal: "of the phone target", ends: "Auction closes in", unfolded: "Open view", folded: "Folded view",
      hint: "Open and folded views share the same spot IDs and positions. Select any brand mark to inspect and bid for that placement.",
      printable: "Camera-side shell", screen: "Outer display · no placements", bid: "Bid", outbid: "Outbid",
      story: `Ten stickers. Fourteen days. One ${productEn} in the real world.`, story2: "A winning bid buys one finite physical placement, a linked listing on this page, and appearances in the campaign’s public launch and everyday-use content. Impressions, clicks and ROI are not guaranteed.", howLink: "How the campaign works",
    },
    recognition: { title: "A new device attracts attention. Ten brands can become part of its first public story.", link: "View available placements", status: "10 measured placements · camera-side shell only" },
    auction: { eyebrow: "LIVE AUCTION", title: "One spot ID, one exact physical position.", lead: "The device and the table use the same spot number, dimensions, leading brand and bid. Select either view to bid.", note: "Cameras, flash, hinge and outer display always remain clear.", placement: "Placement", size: "Print size", held: "Leading brand", bid: "Leading bid", bids: "bids", oneBid: "bid", shell: "camera-side shell", action: "Bid", available: "Available" },
    flow: { eyebrow: "HOW IT WORKS", title: "Three steps", steps: [["Choose one measured placement","Select one of the ten numbered zones on the camera-side shell."],["Place a verified USDT bid","Choose a supported network and send the quoted 20% deposit before the payment window expires."],["Join the finished device","The winning artwork is reviewed, printed and carried in public for 14 days after the device arrives."]] },
    purchase: { eyebrow: "WHAT THE BIDS FUND", title: `Enough to buy one ${productEn}.`, lead: "The campaign has one clear funding target.", name: `1 × ${productEn}, Graphite`, sub: "Campaign device", rows: [["Purchase",`Buy one ${productEn} when it is available`],["Apply","Print and fit ten approved vinyl stickers"],["Carry","Use the completed device in public for 14 days"],["Publish","Include it in launch photos, video and everyday-use updates"]], note: "The 14-day placement period starts after the device is delivered and every winning sticker is installed." },
    faq: { eyebrow: "DETAILS", title: "Questions & Answers", items: [
      ["What is being sold?","A 14-day physical advertising placement on one numbered shell zone, plus a linked listing on this page and inclusion in campaign content. The bidder is not buying the phone."],
      ["What do the funds buy?",`One graphite ${productEn}. The campaign target is 2,899 USDT.`],
      ["How do bidding and USDT payment work?","Enter a valid email and brand, choose an enabled network, and send the quoted 20% deposit within 15 minutes. The bid becomes leading only after the exact token transfer is confirmed on-chain."],
      ["Which networks are supported?","Ethereum ERC-20 and BNB Smart Chain BEP-20 can use the same EVM receiving address. Solana SPL uses a separate Solana wallet address. Always match the selected network and token contract exactly."],
      ["What happens after I am outbid?","The previous deposit enters the refund queue. Refunds are reviewed and returned to the original sending wallet; blockchain network fees and timing are disclosed in the auction terms."],
      ["Can any brand participate?","Every brand and artwork is reviewed. Unlawful, deceptive, hateful, unsafe or unsuitable submissions can be refused and moved to the refund queue."],
      ["What if the device cannot be purchased?","If the campaign cannot obtain the device by its published fulfillment deadline, confirmed campaign payments are moved to the refund queue."],
      ["What performance is guaranteed?","The winning placement and stated 14-day use are the deliverables. No impression, click, lead, sale or return-on-investment target is promised."],
    ] },
      waitlist: { eyebrow: "FOLLOW THE LAUNCH", title: "Get the auction-opening note", text: "Join once. You will receive the launch notice and essential campaign updates only.", email: "Email", handle: "X handle (optional)", button: "Join the waitlist", local: "Your email is used only for campaign updates described in the privacy notice.", localDemo: "In local mode, this entry stays in the current browser.", unavailable: "The production service is temporarily unavailable. No entry has been recorded.", done: "You’re on the list.", doneSub: "Your entry has been received.", doneDemo: "Saved in this browser.", error: "Please try again." },
    globe: { eyebrow: "EARTH, LIVE", title: "Drag the planet. Open a real event.", lead: "The globe uses the live USGS M2.5+ earthquake feed. Drag to rotate, scroll or pinch to zoom, use the compass, and select any event.", loading: "Connecting to USGS…", live: "USGS live", retry: "Retry live feed", events: "events loaded", selected: "Selected event", depth: "km deep", opens: "local visits", instruction: "Drag · zoom · select a marker", source: "USGS GeoJSON · MapLibre" },
    footer: { hi: "Built by @sergepoliakov", bio: "An open-source campaign that turns one physical surface into ten finite media placements.", prompt: "Want the public launch?", join: "Join the waitlist.", privacy: "Privacy", terms: "Auction terms", source: "Source code", legal: "Independent campaign. No affiliation, endorsement or sponsorship is claimed. Third-party marks remain the property of their owners." },
    modal: {
      shell: "Camera-side shell", current: "Current bid", by: "by", available: "available", bid: "Your bid (USDT)", minimum: "Minimum", settle: "auction settles in USDT", deposit: "20% deposit", due: "Due now", brand: "Brand name", email: "Email", website: "Website (optional)", handle: "X handle (optional)", network: "Payment network", networkRequired: "Choose an enabled payment network.", upload: "Upload artwork", uploadTypes: "PNG · JPG · WEBP · max 1 MB", close: "Close", review: "Artwork is reviewed before it can be printed.", continue: "Create payment quote", verify: "Verify on-chain payment", transaction: "Transaction hash / signature", transactionHelp: "Send the exact token and amount on the selected network, then paste the transaction identifier.", quoteExpires: "Payment quote expires", destination: "Receiving address", token: "Token contract / mint", copy: "Copy", copied: "Copied", success: "now leads spot", requiredBrand: "Enter a brand name.", validEmail: "Enter a valid email.", fileLarge: "Use an image smaller than 1 MB.", fileType: "Use PNG, JPG or WEBP.", paymentError: "Payment could not be verified yet.", demo: "Open-source demonstration: no wallet address is shown and no payment is requested.", demoAction: "Preview this bid", demoSuccess: "Demo bid updated in this browser.", unavailable: "The production payment service is unavailable. No bid or payment can be submitted.", pendingRefund: "The transfer was found, but this bid needs a refund review." },
    legal: {
      back: "Brand My Fold", privacyTitle: "Privacy", privacySummary: "The production service processes the minimum data needed to run the auction, verify USDT transfers, review artwork and fulfil winning placements.",
      privacySections: [["Auction data","We process email, brand name, optional website and X handle, selected spot, bid amount, payment network and transaction identifier."],["Artwork","PNG, JPG and WEBP artwork is stored in private object storage and reviewed before publication. Unapproved artwork is not displayed publicly."],["Blockchain records","Wallet addresses, token transfers and transaction identifiers are public blockchain data. The service verifies them against the selected network and payment quote."],["Service providers","Cloudflare provides hosting, database, object storage, abuse protection and logs. MapLibre/OpenFreeMap and USGS provide the public map experience."],["Open-source edition","When the production API is unavailable, local bids and waitlist entries stay in the browser and are not submitted to the live auction."]],
      termsTitle: "Auction terms", termsSummary: "A winning bid purchases the stated physical advertising service. It does not purchase ownership of the phone, an investment product or a guaranteed marketing result.",
      termsSections: [["Bidding","A bid becomes leading only after its 20% USDT deposit is verified on-chain. New bids must meet the displayed minimum and clear any current leading bid by at least 10 USDT."],["Networks and token contracts","Send only the exact supported token on the network selected in the payment quote. Transfers on an unsupported network, to another address or using another token may be unrecoverable."],["Review","Every brand and artwork is subject to approval. A refused submission enters the refund queue and never appears as an approved placement."],["Outbids and refunds","When a confirmed bid is exceeded, its deposit enters the refund queue for review and return to the original sending wallet. Refund records remain auditable; no private signing key is stored in the application."],["Winning balance","The winner’s deposit counts toward the final price. The remaining balance must be paid by the deadline in the closing notice."],["Fulfilment","The 14-day period begins after the campaign device is purchased, delivered and fitted with all approved stickers. If the device cannot be obtained by the published deadline, confirmed campaign payments enter the refund queue."],["Performance","The service delivers the selected physical placement and stated campaign appearances. Impressions, clicks, leads, sales and ROI are not guaranteed."],["Brand rights","Each bidder confirms it has permission to submit its artwork and link. The campaign may remove unlawful, misleading or infringing material."]],
      updated: "Updated 27 August 2026",
    },
  },
  zh: {
    nav: { auction: "实时竞拍", how: "参与方式", device: "资金用途", faq: "常见问题", cta: "选择广告位" },
    hero: {
      visitors: "次访问", title: "把你的品牌，贴上我的 Fold。", subtitle: `未来这台${productZh}的摄像头侧外壳，只有十个经过测量的广告位。`, raised: "当前领先出价", starting: "起拍价", goal: "手机目标已完成", ends: "竞拍剩余", unfolded: "展开效果", folded: "折叠效果",
      hint: "展开与折叠形态共用同一套广告位编号和位置。点击任意品牌标识，即可查看并竞拍对应广告位。", printable: "摄像头侧外壳", screen: "外屏 · 不设广告位", bid: "出价", outbid: "加价", story: `十张贴纸，十四天，一台走进真实生活的${productZh}。`, story2: "获胜品牌购买的是一个有限的实体广告位、本页品牌链接，以及活动首发和日常使用内容中的公开呈现。这里不承诺曝光量、点击量或投资回报。", howLink: "了解参与方式",
    },
    recognition: { title: "一台新设备的首次亮相，会自然吸引关注。十个品牌可以进入它的第一段公开故事。", link: "查看可竞拍位置", status: "10 个实体广告位 · 仅限摄像头侧外壳" },
    auction: { eyebrow: "实时竞拍", title: "一个广告位编号，对应一个准确的实体位置。", lead: "设备图与竞拍列表共用同一套编号、尺寸、领先品牌和出价。点击任意一处即可参与。", note: "摄像头、闪光灯、铰链和外屏始终保持完整。", placement: "广告位", size: "印刷尺寸", held: "领先品牌", bid: "领先出价", bids: "次出价", oneBid: "次出价", shell: "摄像头侧外壳", action: "出价", available: "可竞拍" },
    flow: { eyebrow: "参与方式", title: "三步完成", steps: [["选择准确位置","从摄像头侧外壳上的十个编号区域中选择一个。"],["提交经链上验证的 USDT 出价","选择已启用的网络，并在付款窗口结束前支付系统生成的 20% 订金。"],["成为最终外观的一部分","获胜图稿通过审核后会被印成贴纸；设备到货后随设备公开使用 14 天。"]] },
    purchase: { eyebrow: "这些资金用于什么", title: `够我买一台${productZh}。`, lead: "整场竞拍只有一个明确的资金目标。", name: `1 × ${productZh}，石墨色`, sub: "本次活动使用的设备", rows: [["购买",`在正式发售后购买一台${productZh}`],["粘贴","印刷并安装十张通过审核的品牌贴纸"],["携带","带着完成后的设备公开使用 14 天"],["发布","让它出现在首发照片、视频和日常使用记录中"]], note: "设备到货并完成全部获胜贴纸安装后，14 天展示周期正式开始。" },
    faq: { eyebrow: "详细说明", title: "常见问题", items: [
      ["这里出售的是什么？","一个编号区域内为期 14 天的实体广告展示服务，同时包含本页品牌链接和活动公开内容中的呈现。竞拍者购买的不是手机本身。"],
      ["这些资金用于什么？",`购买一台石墨色${productZh}，本次活动的目标金额为 2,899 USDT。`],
      ["竞拍和 USDT 付款如何进行？","填写有效邮箱和品牌资料，选择已启用的网络，在 15 分钟内支付系统生成的 20% 订金。只有金额、代币合约、收款地址和网络全部匹配并完成链上确认后，出价才会成为领先出价。"],
      ["支持哪些网络？","Ethereum ERC-20 与 BNB Smart Chain BEP-20 可以使用同一个 EVM 收款地址；Solana SPL 必须使用独立的 Solana 钱包地址。付款时必须严格匹配页面选中的网络与代币合约。"],
      ["被别人超过后怎么办？","原订金会进入退款队列，经核对后退回原付款钱包。具体处理时间和区块链网络费用以竞拍条款为准。"],
      ["任何品牌都能参加吗？","所有品牌和图稿都需要审核。违法、欺骗、仇恨、危险或不适合公开展示的内容会被拒绝，并进入退款流程。"],
      ["如果设备无法购买怎么办？","如果在公布的履约期限前仍无法取得活动设备，已确认的活动付款会进入退款队列。"],
      ["会保证多少曝光效果？","交付内容是获胜广告位、14 天实体使用以及页面所述的公开呈现；不承诺曝光、点击、线索、成交或投资回报。"],
    ] },
    waitlist: { eyebrow: "关注正式上线", title: "竞拍开放时通知我", text: "只需登记一次，我们只发送开拍通知和必要的活动更新。", email: "邮箱", handle: "X 账号（选填）", button: "加入等候名单", local: "你的邮箱仅用于隐私说明中列明的活动通知。", localDemo: "本地模式下，记录仅保存在当前浏览器中。", unavailable: "正式服务暂时不可用，本次信息尚未登记。", done: "登记成功。", doneSub: "我们已经收到你的信息。", doneDemo: "记录已保存在当前浏览器中。", error: "提交失败，请稍后重试。" },
    globe: { eyebrow: "实时地球", title: "转动地球，打开一个真实事件。", lead: "地球接入 USGS 实时 2.5 级以上地震数据。拖动可旋转，滚轮或双指可缩放，指南针可复位，圆点可以点击。", loading: "正在连接 USGS…", live: "USGS 实时数据", retry: "重新连接", events: "个事件已载入", selected: "当前事件", depth: "公里深", opens: "次本地访问", instruction: "拖动 · 缩放 · 选择圆点", source: "USGS GeoJSON · MapLibre" },
    footer: { hi: "由 @sergepoliakov 设计与开发", bio: "一个开源活动：把一块实体表面变成十个有限、可验证的媒体位置。", prompt: "想收到正式开拍通知？", join: "加入等候名单。", privacy: "隐私说明", terms: "竞拍条款", source: "开源代码", legal: "独立活动，不主张任何关联、背书或赞助关系。第三方商标归各自权利方所有。" },
    modal: {
      shell: "摄像头侧外壳", current: "当前出价", by: "领先品牌", available: "当前可竞拍", bid: "你的出价（USDT）", minimum: "最低出价", settle: "竞拍统一使用 USDT 结算", deposit: "20% 订金", due: "本次应付", brand: "品牌名称", email: "邮箱", website: "网站（选填）", handle: "X 账号（选填）", network: "付款网络", networkRequired: "请选择一个已经启用的付款网络。", upload: "上传品牌图稿", uploadTypes: "PNG · JPG · WEBP · 最大 1 MB", close: "关闭", review: "图稿通过审核后才会用于印刷。", continue: "生成付款信息", verify: "验证链上付款", transaction: "交易哈希 / Solana 签名", transactionHelp: "请在所选网络发送页面显示的准确代币与金额，再粘贴交易标识。", quoteExpires: "付款信息有效期至", destination: "收款地址", token: "代币合约 / Mint", copy: "复制", copied: "已复制", success: "已成为广告位", requiredBrand: "请填写品牌名称。", validEmail: "请填写有效邮箱。", fileLarge: "图稿必须小于 1 MB。", fileType: "请使用 PNG、JPG 或 WEBP。", paymentError: "暂未核验到符合条件的链上付款。", demo: "当前为开源演示环境，不展示收款地址，也不会要求付款。", demoAction: "预览本次出价", demoSuccess: "演示出价已更新到当前浏览器。", unavailable: "正式付款服务暂时不可用，目前不能提交出价或付款。", pendingRefund: "已找到付款，但该笔出价需要进入退款审核。" },
    legal: {
      back: "Brand My Fold", privacyTitle: "隐私说明", privacySummary: "正式服务只处理运行竞拍、核验 USDT 转账、审核图稿和交付获胜广告位所必需的数据。",
      privacySections: [["竞拍资料","我们处理邮箱、品牌名称、选填的网站和 X 账号、所选广告位、出价金额、付款网络及交易标识。"],["品牌图稿","PNG、JPG 和 WEBP 图稿保存在私有对象存储中，经审核后才会公开显示。未通过审核的图稿不会公开。"],["区块链记录","钱包地址、代币转账和交易标识属于公开链上数据；系统会用它们核对付款网络、代币和付款信息。"],["服务提供方","Cloudflare 提供托管、数据库、对象存储、防滥用与日志能力；MapLibre、OpenFreeMap 与 USGS 提供公开地图体验。"],["开源版本","正式接口不可用时，本地出价和等候名单仅保存在浏览器中，不会提交至实时竞拍。"]],
      termsTitle: "竞拍条款", termsSummary: "获胜出价购买的是页面所述实体广告展示服务，不包含手机所有权、投资权益或任何营销效果保证。",
      termsSections: [["竞拍生效","20% USDT 订金完成链上核验后，出价才会成为领先出价。新出价必须达到页面最低金额，并在已有领先出价基础上至少增加 10 USDT。"],["网络与代币合约","只能按照付款信息发送指定网络上的指定代币。通过其他网络、转入其他地址或使用其他代币的交易可能无法找回。"],["品牌审核","所有品牌和图稿都需要审核。被拒绝的提交会进入退款队列，不会作为已批准广告位公开。"],["超价与退款","已确认出价被超过后，订金进入退款队列，经核对后退回原付款钱包。应用不会保存可直接签名转账的私钥。"],["获胜余款","获胜订金计入最终成交价，剩余款项需要在结拍通知规定的期限内付清。"],["活动履约","活动设备完成购买、到货并安装全部通过审核的贴纸后，14 天展示周期开始。如果在公布期限前无法取得设备，已确认付款进入退款队列。"],["效果边界","交付内容是对应实体广告位和页面所述公开呈现，不承诺曝光、点击、线索、成交或投资回报。"],["图稿权利","提交人确认有权使用上传图稿与链接。活动方可以移除违法、误导或侵犯第三方权利的内容。"]],
      updated: "更新于 2026 年 8 月 27 日",
    },
  },
};
