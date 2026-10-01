// Original work and verified original-interface previews, September 2026.
// Internal previews use original access screens or explicitly fictional sample data.
// Client ownership is independent from the personal domains used to publish work.
export const publishingDomains = [
  {
    "id": "milo-messina",
    "name": "milomessina.com",
    "url": "https://milomessina.com",
    "aliases": [
      "Milo Messina",
      "milomessina.com"
    ]
  },
  {
    "id": "bijan-izadian",
    "name": "bijanizadian.com",
    "url": "https://bijanizadian.com",
    "aliases": [
      "Bijan Izadian",
      "bijanizadian.com"
    ]
  }
];

export const archiveProjects = [
  {
    "id": "fomo",
    "name": "fomo",
    "description": "Campus experiences, chapter journeys, original pages, and the tools behind fomo.",
    "items": [
      {
        "id": "fomo-campus",
        "name": "Campus landing",
        "category": "Pages",
        "description": "A program entry page for chapter competition, campus roles, and dinners.",
        "sourcePath": "bijanizadian.com/campus/landing.html",
        "sourceUrl": "https://bijanizadian.com/campus/landing",
        "preview": "landing",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested.",
        "thumbnail": "/agencykit/thumbnails/fomo-campus.jpg",
        "skeletonKey": "campaign-page",
        "skeletonSections": [
          "Brand and navigation",
          "Campaign hero",
          "Competition pathway",
          "Team pathway",
          "Dinner pathway",
          "Directory and footer"
        ],
        "tags": [
          "campus",
          "college",
          "landing",
          "campaign",
          "program",
          "marketing"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "planet",
            "astronaut",
            "blue",
            "large typography",
            "three cards"
          ],
          "features": [
            "landing page",
            "program navigation",
            "chapter competition",
            "campus recruiting",
            "dinner hosting"
          ],
          "phrases": [
            "dark space landing",
            "find a campus program",
            "recruit campus ambassadors",
            "choose a campus pathway"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-greek-wars",
        "name": "Greek Wars",
        "category": "Pages",
        "description": "Competition overview with chapter qualification, program sections, and standings presentation.",
        "sourcePath": "bijanizadian.com/greekwars.html",
        "sourceUrl": "https://bijanizadian.com/greekwars",
        "preview": "event",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested. The source page includes illustrative standings.",
        "thumbnail": "/agencykit/thumbnails/fomo-greek-wars.jpg",
        "skeletonKey": "event-page",
        "skeletonSections": [
          "Competition hero",
          "Prize categories",
          "Onboarding steps",
          "Qualification details",
          "Campus map",
          "Standings board",
          "Join action"
        ],
        "tags": [
          "greekwars",
          "chapter",
          "competition",
          "leaderboard",
          "campaign",
          "event"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "planet",
            "blue",
            "purple",
            "centered hero",
            "large typography"
          ],
          "features": [
            "competition",
            "leaderboard",
            "prizes",
            "chapter registration",
            "campus map",
            "app download"
          ],
          "phrases": [
            "launch a chapter competition",
            "show campus standings",
            "explain prizes and qualification"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-clan",
        "name": "Chapter member portal",
        "category": "Portals",
        "description": "A chapter-specific member signup journey with progress and app-download instructions.",
        "sourcePath": "bijanizadian.com/greekwars/clan.html",
        "sourceUrl": "https://bijanizadian.com/greekwars/clan",
        "preview": "portal",
        "status": "contextual",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original chapter portal. Opening a real portal requires its chapter-specific member link; no participant-specific URL or data is included. Preview captured from the original frontend on 2026-09-30: Original chapter portal · fictional sample chapter. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/fomo-clan.jpg",
        "skeletonKey": "member-portal",
        "skeletonSections": [
          "Chapter identity",
          "Member progress",
          "Signup questions",
          "App instructions",
          "Completion and sharing"
        ],
        "tags": [
          "chapter",
          "clan",
          "member",
          "onboarding",
          "signup",
          "progress"
        ],
        "previewSource": "local-original",
        "previewCaption": "Original chapter portal · fictional sample chapter",
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "split layout",
            "progress bar",
            "stepper",
            "blue buttons"
          ],
          "features": [
            "signup",
            "member onboarding",
            "chapter progress",
            "app download",
            "copy link"
          ],
          "phrases": [
            "white signup form",
            "join a chapter",
            "track member signup progress",
            "guide members into the app"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-clan-claim",
        "name": "Chapter claim flow",
        "category": "Forms",
        "description": "Chapter-head setup that collects chapter details, attaches an app referral, and produces a member link.",
        "sourcePath": "bijanizadian.com/greekwars/claim.html",
        "sourceUrl": "https://bijanizadian.com/greekwars/claim",
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested.",
        "thumbnail": "/agencykit/thumbnails/fomo-clan-claim.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Chapter introduction",
          "Chapter details",
          "Referral attachment",
          "Member link and sharing"
        ],
        "tags": [
          "chapter",
          "claim",
          "head",
          "onboarding",
          "registration",
          "referral"
        ],
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "split layout",
            "stepper",
            "blue buttons",
            "outlined inputs"
          ],
          "features": [
            "signup",
            "registration",
            "chapter setup",
            "referral attachment",
            "member link",
            "sharing"
          ],
          "phrases": [
            "white signup form",
            "register a chapter",
            "create a chapter member link",
            "collect chapter contact details"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-onboard",
        "name": "Chapter registration",
        "category": "Forms",
        "description": "A step-by-step registration form for a school, chapter, active roster size, and chapter contact.",
        "sourcePath": "bijanizadian.com/greekwars/onboard.html",
        "sourceUrl": "https://bijanizadian.com/greekwars/onboard",
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested.",
        "thumbnail": "/agencykit/thumbnails/fomo-onboard.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Program context",
          "Step-by-step questions",
          "Review and submit",
          "Next steps"
        ],
        "tags": [
          "chapter",
          "registration",
          "onboarding",
          "application",
          "signup"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "planet",
            "purple",
            "split layout",
            "stepper"
          ],
          "features": [
            "signup",
            "registration",
            "multi-step form",
            "chapter contact",
            "roster size",
            "school selection"
          ],
          "phrases": [
            "dark registration form",
            "onboard a fraternity",
            "collect chapter and school details"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-refer",
        "name": "Fraternity referral builder",
        "category": "Tools",
        "description": "A compact personal referral-link builder with share and copy actions.",
        "sourcePath": "bijanizadian.com/greekwars/refer.html",
        "sourceUrl": "https://bijanizadian.com/greekwars/refer",
        "preview": "referral",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested.",
        "thumbnail": "/agencykit/thumbnails/fomo-refer.jpg",
        "skeletonKey": "referral-flow",
        "skeletonSections": [
          "Referral offer",
          "Personal details",
          "Link builder",
          "Copy and share",
          "Attribution guidance"
        ],
        "tags": [
          "referral",
          "fraternity",
          "link",
          "share",
          "attribution"
        ],
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "split layout",
            "stepper",
            "blue buttons"
          ],
          "features": [
            "referral link builder",
            "personal details",
            "copy link",
            "sharing",
            "attribution"
          ],
          "phrases": [
            "build a personal referral link",
            "refer a fraternity",
            "copy a shareable invitation"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-dinners",
        "name": "Dinner Series",
        "category": "Pages",
        "description": "An event-program page explaining hosting, the table experience, and application steps.",
        "sourcePath": "bijanizadian.com/dinners.html",
        "sourceUrl": "https://bijanizadian.com/dinners",
        "preview": "event",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested. Program terms and sample standings are not verified operating results.",
        "thumbnail": "/agencykit/thumbnails/fomo-dinners.jpg",
        "skeletonKey": "event-page",
        "skeletonSections": [
          "Event hero",
          "Host offer",
          "Table concept",
          "Program board",
          "Event timeline",
          "Host requirements",
          "Application action"
        ],
        "tags": [
          "dinner",
          "event",
          "host",
          "community",
          "campaign"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "planet",
            "purple",
            "centered hero",
            "large typography"
          ],
          "features": [
            "event program",
            "dinner hosting",
            "host application",
            "timeline",
            "host requirements"
          ],
          "phrases": [
            "recruit dinner hosts",
            "explain a sponsored dinner program",
            "host a campus event"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-dinner-application",
        "name": "Dinner host application",
        "category": "Forms",
        "description": "A focused application journey for a proposed dinner host and table.",
        "sourcePath": "bijanizadian.com/dinners/apply.html",
        "sourceUrl": "https://bijanizadian.com/dinners/apply",
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested.",
        "thumbnail": "/agencykit/thumbnails/fomo-dinner-application.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Host introduction",
          "Host details",
          "Proposed table",
          "Review and send",
          "Confirmation"
        ],
        "tags": [
          "dinner",
          "host",
          "apply",
          "application",
          "form"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "purple",
            "split layout",
            "stepper",
            "large typography",
            "outlined inputs"
          ],
          "features": [
            "application",
            "multi-step form",
            "host details",
            "dinner proposal",
            "review and submit"
          ],
          "phrases": [
            "apply to host a dinner",
            "collect event host applications",
            "one question at a time"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-campus-visit",
        "name": "Campus trip request",
        "category": "Forms",
        "description": "A multi-step trip request covering travel, socials, proposed work, and contact details.",
        "sourcePath": "bijanizadian.com/campus/visit.html",
        "sourceUrl": "https://bijanizadian.com/campus/visit",
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested. The source prepares an email request; no request was sent.",
        "thumbnail": "/agencykit/thumbnails/fomo-campus-visit.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Trip introduction",
          "Travel details",
          "Social profiles",
          "Participation route",
          "Contact details",
          "Request review"
        ],
        "tags": [
          "campus",
          "trip",
          "travel",
          "visit",
          "request",
          "form"
        ],
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "split layout",
            "calendar",
            "stepper",
            "blue buttons"
          ],
          "features": [
            "trip request",
            "date picker",
            "travel choices",
            "social profiles",
            "contact details",
            "multi-step form"
          ],
          "phrases": [
            "plan a campus trip",
            "collect travel preferences",
            "request a college visit"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-assistant",
        "name": "Ask fomo prototype",
        "category": "Tools",
        "description": "A centered assistant launcher and chat-widget prototype on a minimal test page.",
        "sourcePath": "fomo-assistant/public/index.html",
        "sourceUrl": null,
        "preview": "portal",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original assistant prototype. No public deployment is claimed; this archive does not import the widget or send chat requests. Preview captured from the original frontend on 2026-09-30: Original Ask fomo prototype · local preview. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/fomo-assistant.jpg",
        "skeletonKey": "assistant",
        "skeletonSections": [
          "Centered launcher",
          "Chat panel",
          "Suggested questions",
          "Conversation",
          "Message composer"
        ],
        "tags": [
          "ai",
          "assistant",
          "chat",
          "chatbot",
          "widget",
          "help"
        ],
        "previewSource": "local-original",
        "previewCaption": "Original Ask fomo prototype · local preview",
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "minimal",
            "lavender",
            "floating panel",
            "soft shadow",
            "rounded corners"
          ],
          "features": [
            "chat",
            "assistant widget",
            "FAQ",
            "question answering",
            "suggested questions",
            "message composer"
          ],
          "phrases": [
            "answer questions about fomo",
            "add a chat assistant",
            "help visitors find answers"
          ]
        }
      },
      {
        "id": "fomo-campus-directory",
        "name": "Campus page directory",
        "category": "Tools",
        "description": "A route directory that organizes program entry points and related page journeys.",
        "sourcePath": "bijanizadian.com/campus/directory.html",
        "sourceUrl": "https://bijanizadian.com/campus/directory",
        "preview": "directory",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original source page. The live URL returned HTTP 200 with the expected page title on 2026-09-29; form submissions and private data were not tested.",
        "thumbnail": "/agencykit/thumbnails/fomo-campus-directory.jpg",
        "skeletonKey": "directory",
        "skeletonSections": [
          "Directory introduction",
          "Competition journey",
          "Team journey",
          "Dinner journey",
          "Role shortcuts",
          "Related links"
        ],
        "tags": [
          "campus",
          "directory",
          "navigation",
          "journey",
          "links"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "minimal",
            "blue",
            "large typography",
            "connected cards",
            "flowchart"
          ],
          "features": [
            "page directory",
            "navigation",
            "program routes",
            "role shortcuts",
            "related links"
          ],
          "phrases": [
            "find every campus page",
            "show connected page journeys",
            "browse program entry points"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-irrigation",
        "name": "Irrigation",
        "category": "Portals",
        "description": "An internal relationship workspace for conversations, reviewed next actions, tasks, and chapters.",
        "sourcePath": "fomo Irrigation/src/App.tsx",
        "sourceUrl": "https://bijanizadian.com/irrigation",
        "preview": "dashboard",
        "status": "protected",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Original internal relationship application. The route is source-defined; protected workspace access and live records were not inspected. Preview captured from the original frontend on 2026-09-30: Original Irrigation app · built-in sample workspace. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/fomo-irrigation.jpg",
        "skeletonKey": "relationship-workspace",
        "skeletonSections": [
          "Workspace navigation",
          "Review queue",
          "Relationship list",
          "Interaction details",
          "Follow-up tasks",
          "Chapter views"
        ],
        "tags": [
          "crm",
          "relationships",
          "contacts",
          "outreach",
          "tasks",
          "workspace"
        ],
        "previewSource": "local-original",
        "previewCaption": "Original Irrigation app · built-in sample workspace",
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "blue",
            "sidebar",
            "compact rows",
            "summary cards",
            "dashboard"
          ],
          "features": [
            "CRM",
            "contacts",
            "relationships",
            "follow ups",
            "tasks",
            "review queue",
            "activity history",
            "chapter views"
          ],
          "phrases": [
            "keep track of people and follow ups",
            "manage relationships",
            "review next actions",
            "remember conversations"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-campus-original",
        "name": "Campus program hub",
        "category": "Pages",
        "description": "The original college program page with competition, events, team roles, and an application.",
        "sourcePath": "bijanizadian.com/campus.html",
        "sourceUrl": "https://bijanizadian.com/campus",
        "preview": "landing",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. This is a distinct earlier program hub, separate from the newer campus landing.",
        "thumbnail": "/agencykit/thumbnails/fomo-campus-original.jpg",
        "skeletonKey": "campaign-page",
        "skeletonSections": [
          "Brand and navigation",
          "Program hero",
          "Greek Wars feature",
          "Other program cards",
          "Five team roles",
          "Campus application",
          "Final action"
        ],
        "tags": [
          "campus",
          "college",
          "program",
          "landing",
          "team",
          "application"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "planet",
            "astronaut",
            "purple",
            "centered hero",
            "large typography"
          ],
          "features": [
            "landing page",
            "program hub",
            "competition",
            "events",
            "campus recruiting",
            "application"
          ],
          "phrases": [
            "bring campus programs together",
            "recruit a college team",
            "explore events and opportunities"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-campus-connected",
        "name": "Campus campaign",
        "category": "Pages",
        "description": "A long-form campus campaign linking the national board, chapter onboarding, dinners, and team roles.",
        "sourcePath": "bijanizadian.com/campus-connected.html",
        "sourceUrl": "https://bijanizadian.com/campus-connected",
        "preview": "landing",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. Illustrative chapter and roster treatments are design examples, not verified participation.",
        "thumbnail": "/agencykit/thumbnails/fomo-campus-connected.jpg",
        "skeletonKey": "campaign-page",
        "skeletonSections": [
          "Campaign hero",
          "National map",
          "Chapter onboarding story",
          "Dinner feature",
          "Campus roles",
          "Closing action"
        ],
        "tags": [
          "campus",
          "campaign",
          "college",
          "chapter",
          "map",
          "landing"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "planet",
            "astronaut",
            "blue",
            "large typography",
            "split hero"
          ],
          "features": [
            "landing page",
            "campaign",
            "national map",
            "chapter onboarding",
            "dinner hosting",
            "campus recruiting"
          ],
          "phrases": [
            "dark space landing",
            "connect a campus campaign",
            "show the national competition",
            "recruit campus ambassadors"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-campus-wars",
        "name": "Campus Wars",
        "category": "Pages",
        "description": "A chapter-competition page with a chapter preview, standings presentation, prize sections, and entry review.",
        "sourcePath": "bijanizadian.com/campus-wars.html",
        "sourceUrl": "https://bijanizadian.com/campus-wars",
        "preview": "event",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. Delivered demo page: standings are illustrative and entry is review-only; registration is not submitted.",
        "thumbnail": "/agencykit/thumbnails/fomo-campus-wars.jpg",
        "skeletonKey": "event-page",
        "skeletonSections": [
          "Competition hero",
          "Section navigation",
          "Chapter overview",
          "Standings presentation",
          "Prize categories",
          "Competition notes",
          "Entry review form"
        ],
        "tags": [
          "campus",
          "wars",
          "chapter",
          "competition",
          "leaderboard",
          "registration",
          "demo"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "orange",
            "sun",
            "large typography",
            "blue buttons"
          ],
          "features": [
            "competition",
            "leaderboard",
            "chapter preview",
            "prizes",
            "entry review",
            "registration"
          ],
          "phrases": [
            "bring a chapter into a competition",
            "compare campus standings",
            "review a competition entry"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-gameday",
        "name": "Game Day",
        "category": "Pages",
        "description": "A school-versus-school event page centered on a live-style scoreboard and activity feed.",
        "sourcePath": "bijanizadian.com/gameday.html",
        "sourceUrl": "https://bijanizadian.com/gameday",
        "preview": "event",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. The source explicitly uses simulated trades and states that no school is competing yet.",
        "thumbnail": "/agencykit/thumbnails/fomo-gameday.jpg",
        "skeletonKey": "event-page",
        "skeletonSections": [
          "Event hero",
          "Head-to-head scoreboard",
          "Activity feed",
          "Top participants",
          "How it works",
          "Fixture list",
          "Rules and action"
        ],
        "tags": [
          "gameday",
          "game",
          "day",
          "school",
          "scoreboard",
          "event",
          "demo"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "planet",
            "purple",
            "centered hero"
          ],
          "features": [
            "scoreboard",
            "head-to-head competition",
            "activity feed",
            "participant ranking",
            "fixture list",
            "event rules"
          ],
          "phrases": [
            "show two schools competing",
            "follow game day activity",
            "compare a head to head scoreboard"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-crewsheet",
        "name": "Dinner crew sheet",
        "category": "Tools",
        "description": "A shared dinner checklist organized around host, logistics, and media responsibilities.",
        "sourcePath": "bijanizadian.com/crewsheet.html",
        "sourceUrl": "https://bijanizadian.com/crewsheet",
        "preview": "dashboard",
        "status": "contextual",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. A real sheet requires a dinner code. The page may reopen a previously saved code, so previews must stop at a fresh empty entry gate. No dinner data or codes are included. Preview captured from the original frontend on 2026-09-30: Original crew sheet · dinner-code entry. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/fomo-crewsheet.jpg",
        "skeletonKey": "crew-planner",
        "skeletonSections": [
          "Dinner-code entry",
          "Dinner details",
          "Three role pillars",
          "Role assignments",
          "Task checklist",
          "Sync status"
        ],
        "tags": [
          "dinner",
          "crew",
          "checklist",
          "tasks",
          "roles",
          "coordination"
        ],
        "previewSource": "public-original",
        "previewCaption": "Original crew sheet · dinner-code entry",
        "searchMeta": {
          "visual": [
            "dark",
            "minimal",
            "purple",
            "blue",
            "centered form",
            "code entry"
          ],
          "features": [
            "access screen",
            "dinner code",
            "crew planning",
            "role assignments",
            "task checklist",
            "sync status"
          ],
          "phrases": [
            "organize a dinner crew",
            "assign event responsibilities",
            "open a shared crew sheet"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-claim-links",
        "name": "Chapter claim-link manager",
        "category": "Tools",
        "description": "A team-only directory for distributing the right chapter-head and member links.",
        "sourcePath": "bijanizadian.com/claimlinks.html",
        "sourceUrl": "https://bijanizadian.com/claimlinks",
        "preview": "directory",
        "status": "protected",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. Protected team workflow. No passcode, private head link, participant record, or unlocked screenshot is included. Preview captured from the original frontend on 2026-09-30: Original claim-link manager · access screen. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/fomo-claim-links.jpg",
        "skeletonKey": "relationship-workspace",
        "skeletonSections": [
          "Passcode gate",
          "Chapter counts",
          "Status filters",
          "Chapter link rows",
          "Copy actions",
          "Lock action"
        ],
        "tags": [
          "chapter",
          "claim",
          "links",
          "admin",
          "team",
          "directory"
        ],
        "previewSource": "public-original",
        "previewCaption": "Original claim-link manager · access screen",
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "minimal",
            "centered card",
            "passcode input",
            "blue button"
          ],
          "features": [
            "access screen",
            "passcode gate",
            "chapter link directory",
            "status filters",
            "copy links",
            "lock workspace"
          ],
          "phrases": [
            "distribute chapter claim links",
            "find the right chapter link",
            "team access screen"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-invite",
        "name": "Campus invitation",
        "category": "Pages",
        "description": "A compact invitation with three program tabs, shareable graphics, and clear next actions.",
        "sourcePath": "bijanizadian.com/greekwars/invite.html",
        "sourceUrl": "https://bijanizadian.com/greekwars/invite",
        "preview": "landing",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. Historical offer copy is part of the original page and is not imported as current approved program terms.",
        "thumbnail": "/agencykit/thumbnails/fomo-invite.jpg",
        "skeletonKey": "campaign-page",
        "skeletonSections": [
          "Program tabs",
          "Selected program introduction",
          "Invite graphic",
          "Program action",
          "Share and download",
          "Copy invitation link"
        ],
        "tags": [
          "invite",
          "invitation",
          "share",
          "social",
          "campus",
          "greekwars"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "purple",
            "tabbed layout",
            "split layout",
            "large graphic panel",
            "blue buttons"
          ],
          "features": [
            "invitation",
            "program tabs",
            "share graphics",
            "download graphic",
            "copy link",
            "program navigation"
          ],
          "phrases": [
            "share a campus invitation",
            "switch between program offers",
            "download an invitation graphic"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-hq-visit",
        "name": "HQ visit request",
        "category": "Forms",
        "description": "A public visit-request experience for choosing timing and introducing a potential collaboration.",
        "sourcePath": "bijanizadian.com/hqvisitform/index.html",
        "sourceUrl": "https://bijanizadian.com/hqvisitform",
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. This is the published form route on bijanizadian.com, distinct from the unverified Milo feature-checkout prototype.",
        "thumbnail": "/agencykit/thumbnails/fomo-hq-visit.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Visit introduction",
          "Timing and visit choices",
          "Guest details",
          "Review request",
          "Confirmation"
        ],
        "tags": [
          "hq",
          "visit",
          "request",
          "appointment",
          "collaboration",
          "form"
        ],
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "split layout",
            "calendar",
            "stepper",
            "blue accents"
          ],
          "features": [
            "visit request",
            "date picker",
            "time selection",
            "calendar",
            "guest details",
            "review request"
          ],
          "phrases": [
            "calendar visit request",
            "request a time to visit HQ",
            "collect meeting preferences"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "fomo-campus-manual",
        "name": "Campus team handbook",
        "category": "Pages",
        "description": "A long-form campus-team manual with role guidance, goals, playbooks, and an anchored contents list.",
        "sourcePath": "bijanizadian.com/campus/manual.html",
        "sourceUrl": "https://bijanizadian.com/campus/manual",
        "preview": "directory",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. The route stays on its own local canonical; it did not redirect. Linked external manuals are separate references. Program commitments and private operational content are not extracted.",
        "thumbnail": "/agencykit/thumbnails/fomo-campus-manual.jpg",
        "skeletonKey": "handbook",
        "skeletonSections": [
          "Manual introduction",
          "Contents navigation",
          "Program opportunity",
          "Role guide",
          "Program reference",
          "Task guide",
          "Weekly plan",
          "Team rules"
        ],
        "tags": [
          "campus",
          "manual",
          "handbook",
          "team",
          "roles",
          "guide",
          "playbook"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "photo hero",
            "planet",
            "brown",
            "large typography",
            "blue buttons"
          ],
          "features": [
            "handbook",
            "role guidance",
            "weekly plan",
            "playbook",
            "anchored contents",
            "team rules"
          ],
          "phrases": [
            "explain the first eight weeks",
            "train a campus team",
            "organize a team handbook"
          ]
        },
        "sourceHost": "bijanizadian.com"
      },
      {
        "id": "milo-landingpage",
        "name": "Campus program landing",
        "category": "Pages",
        "description": "A campus program landing page connecting competition, internships, and creator opportunities.",
        "sourcePath": "milomessina/landingpage/index.html",
        "sourceUrl": "https://milomessina.com/landingpage",
        "sourceAliases": [],
        "preview": "landing",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-landingpage.jpg",
        "skeletonKey": "campaign-page",
        "skeletonSections": [
          "Program hero",
          "Competition pathway",
          "Campus team pathway",
          "Creator pathway",
          "Program actions"
        ],
        "tags": [
          "milo",
          "fomo",
          "campus",
          "college",
          "landing",
          "campaign"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "green",
            "campus aerial",
            "low poly",
            "full screen scene",
            "game-like"
          ],
          "features": [
            "landing page",
            "campus scene",
            "program navigation",
            "competition pathway",
            "internship pathway"
          ],
          "phrases": [
            "explore a campus program in 3d",
            "immersive college landing page",
            "choose a campus opportunity"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-fomo",
        "name": "Campus team roles",
        "category": "Pages",
        "description": "A campus-team recruiting page organized around five roles and a working plan.",
        "sourcePath": "milomessina/fomo/index.html",
        "sourceUrl": "https://milomessina.com/fomo",
        "sourceAliases": [],
        "preview": "landing",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-fomo.jpg",
        "skeletonKey": "campaign-page",
        "skeletonSections": [
          "Campus opportunity",
          "Five role cards",
          "Experience and outcomes",
          "Weekly plan",
          "Role application action"
        ],
        "tags": [
          "milo",
          "fomo",
          "campus",
          "team",
          "roles",
          "internship",
          "recruitment"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "blue",
            "purple",
            "centered hero",
            "large typography",
            "metric row"
          ],
          "features": [
            "campus recruiting",
            "role cards",
            "internship",
            "weekly plan",
            "application link"
          ],
          "phrases": [
            "recruit campus ambassadors",
            "choose a campus team role",
            "explain an internship opportunity"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-fomo-apply",
        "name": "Campus team application",
        "category": "Forms",
        "description": "A focused application form for a seat on the campus team.",
        "sourcePath": "milomessina/fomo/apply/index.html",
        "sourceUrl": "https://milomessina.com/fomo/apply",
        "sourceAliases": [],
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-fomo-apply.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Application introduction",
          "Role choice",
          "Personal details",
          "Campus experience",
          "Review and send",
          "Confirmation"
        ],
        "tags": [
          "milo",
          "fomo",
          "campus",
          "team",
          "apply",
          "application",
          "recruitment"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "blue",
            "purple",
            "centered heading",
            "role cards",
            "outlined inputs"
          ],
          "features": [
            "application",
            "role selection",
            "personal details",
            "campus experience",
            "review and submit"
          ],
          "phrases": [
            "apply for a campus role",
            "dark application form",
            "collect student team applications"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-campuswars",
        "name": "Greek Wars campus scene",
        "category": "Pages",
        "description": "A visual competition experience with a campus scene and chapter-oriented navigation.",
        "sourcePath": "milomessina/fomo/campuswars/index.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars",
        "sourceAliases": [
          "https://milomessina.com/fomo/campuswars/"
        ],
        "preview": "event",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. Program results and live standings were not verified. The neutral starter does not reproduce the original 3D scene or its services.",
        "thumbnail": "/agencykit/thumbnails/milo-campuswars.jpg",
        "skeletonKey": "event-page",
        "skeletonSections": [
          "Competition introduction",
          "Campus scene",
          "Chapter selection",
          "Standings presentation",
          "Entry actions"
        ],
        "tags": [
          "milo",
          "fomo",
          "greekwars",
          "campus",
          "competition",
          "3d",
          "chapter",
          "leaderboard"
        ],
        "relatedRoutes": [
          {
            "name": "Campus Wars API",
            "url": "https://milomessina.com/api/campuswars",
            "kind": "endpoint",
            "httpStatus": 200,
            "notes": "Metadata-only HEAD check; JSON payload not fetched."
          }
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "green",
            "low poly",
            "street view",
            "campus buildings",
            "crowds",
            "game-like"
          ],
          "features": [
            "interactive campus",
            "chapter selection",
            "competition",
            "leaderboard",
            "scene navigation",
            "join action"
          ],
          "phrases": [
            "explore a virtual campus village",
            "browse chapters in 3d",
            "join a campus competition"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-girls",
        "name": "fomo girls intake",
        "category": "Forms",
        "description": "An opportunity-intake page for selecting interests and sharing details.",
        "sourcePath": "Published route: milomessina.com/girls",
        "sourceUrl": "https://milomessina.com/girls",
        "sourceAliases": [
          "https://milomessina.com/fomo/girls"
        ],
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. The /fomo/girls alias has the same ETag and declares /girls as its canonical. No matching local source exists in the inspected checkouts.",
        "thumbnail": "/agencykit/thumbnails/milo-girls.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Opportunity selection",
          "Personal details",
          "Participation preferences",
          "Review and confirmation"
        ],
        "tags": [
          "milo",
          "fomo",
          "girls",
          "community",
          "culture",
          "intake",
          "form"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "black",
            "lavender",
            "purple",
            "large typography",
            "serif accent",
            "offer cards"
          ],
          "features": [
            "intake",
            "opportunity selection",
            "referrals",
            "personal details",
            "participation preferences"
          ],
          "phrases": [
            "choose an opportunity",
            "collect interests and details",
            "route visitors by what they want to do"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-fomo-onboard",
        "name": "Clan member onboarding",
        "category": "Forms",
        "description": "An account-to-chapter onboarding journey for members who already have an invitation.",
        "sourcePath": "milomessina/fomo/onboard/index.html",
        "sourceUrl": "https://milomessina.com/fomo/onboard",
        "sourceAliases": [],
        "preview": "form",
        "status": "contextual",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. Real chapter context belongs to the original invitation; no participant-specific link, record, or code is included.",
        "thumbnail": "/agencykit/thumbnails/milo-fomo-onboard.jpg",
        "skeletonKey": "member-portal",
        "skeletonSections": [
          "Chapter context",
          "Account instructions",
          "Member details",
          "Signup confirmation",
          "Next steps"
        ],
        "tags": [
          "milo",
          "fomo",
          "clan",
          "chapter",
          "member",
          "onboarding",
          "signup"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "blue",
            "purple",
            "centered heading",
            "numbered steps",
            "green notice"
          ],
          "features": [
            "signup",
            "member onboarding",
            "app download",
            "account instructions",
            "chapter membership"
          ],
          "phrases": [
            "get new members into a clan",
            "connect an account to a chapter",
            "finish member onboarding"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-fomo-onboard-links",
        "name": "Clan link directory",
        "category": "Tools",
        "description": "An operational directory for locating chapter onboarding links.",
        "sourcePath": "milomessina/fomo/onboard/links/index.html",
        "sourceUrl": "https://milomessina.com/fomo/onboard/links",
        "sourceAliases": [],
        "preview": "directory",
        "status": "protected",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. No live chapter-link table or invitation data is included. This is treated as an operational surface; the archive does not assert that the original enforces authentication. Preview captured from the original frontend on 2026-09-30: Original clan directory · fictional sample chapters. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/milo-fomo-onboard-links.jpg",
        "skeletonKey": "directory",
        "skeletonSections": [
          "Directory introduction",
          "Chapter lookup",
          "Chapter link rows",
          "Copy actions"
        ],
        "tags": [
          "milo",
          "fomo",
          "clan",
          "chapter",
          "links",
          "directory",
          "operations"
        ],
        "previewSource": "local-original",
        "previewCaption": "Original clan directory · fictional sample chapters",
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "blue",
            "purple",
            "compact rows",
            "rounded cards",
            "monospace links"
          ],
          "features": [
            "link directory",
            "chapter lookup",
            "copy message",
            "copy link",
            "onboarding links"
          ],
          "phrases": [
            "find chapter onboarding links",
            "copy a chapter invitation",
            "distribute member links"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-fomo-refer",
        "name": "Campus referral program",
        "category": "Forms",
        "description": "A referral-program page combining program tiers, instructions, and a personal code claim.",
        "sourcePath": "Published route: milomessina.com/fomo/refer",
        "sourceUrl": "https://milomessina.com/fomo/refer",
        "sourceAliases": [],
        "preview": "referral",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. Current payment eligibility and amounts are not validated or copied into the neutral starter.",
        "thumbnail": "/agencykit/thumbnails/milo-fomo-refer.jpg",
        "skeletonKey": "referral-flow",
        "skeletonSections": [
          "Referral introduction",
          "Referral categories",
          "How it works",
          "Code claim form",
          "Attribution guidance"
        ],
        "tags": [
          "milo",
          "fomo",
          "referral",
          "refer",
          "code",
          "share",
          "growth"
        ],
        "relatedRoutes": [
          {
            "name": "App referral bridge",
            "url": "https://milomessina.com/r",
            "kind": "redirect",
            "httpStatus": 200,
            "notes": "The public shell is titled opening fomo and uses a client redirect. It is related routing rather than a distinct visual page."
          }
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "blue",
            "purple",
            "centered hero",
            "large typography",
            "oversized numbers"
          ],
          "features": [
            "referral program",
            "reward tiers",
            "code claim",
            "instructions",
            "attribution"
          ],
          "phrases": [
            "bring people into a program",
            "claim a personal referral code",
            "explain a referral program"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-fomo-report",
        "name": "Weekly campus report",
        "category": "Forms",
        "description": "A weekly reporting form for campus activity and supporting context.",
        "sourcePath": "milomessina/fomo/report/index.html",
        "sourceUrl": "https://milomessina.com/fomo/report",
        "sourceAliases": [],
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-fomo-report.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Report introduction",
          "Reporter details",
          "Weekly activity",
          "Evidence and context",
          "Review and send"
        ],
        "tags": [
          "milo",
          "fomo",
          "campus",
          "weekly",
          "report",
          "activity",
          "form"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "space",
            "blue",
            "green accent",
            "left aligned",
            "outlined inputs",
            "rounded form"
          ],
          "features": [
            "weekly report",
            "reporting form",
            "role selection",
            "activity reporting",
            "supporting context"
          ],
          "phrases": [
            "collect weekly campus updates",
            "report what happened this week",
            "submit team activity"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-fomo-submit",
        "name": "Creator submission",
        "category": "Forms",
        "description": "A creator application and content-submission journey with guidance before the form.",
        "sourcePath": "milomessina/fomo/submit/index.html",
        "sourceUrl": "https://milomessina.com/fomo/submit",
        "sourceAliases": [],
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. Payout terms and submitted creator records were not verified or imported.",
        "thumbnail": "/agencykit/thumbnails/milo-fomo-submit.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Creator introduction",
          "Submission routes",
          "Content requirements",
          "Process overview",
          "Creator details",
          "Post submission",
          "Review confirmation"
        ],
        "tags": [
          "milo",
          "fomo",
          "creator",
          "content",
          "video",
          "submit",
          "application",
          "form"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "blue",
            "purple",
            "centered hero",
            "large typography",
            "oversized numbers"
          ],
          "features": [
            "creator application",
            "content submission",
            "submission requirements",
            "process guidance",
            "review"
          ],
          "phrases": [
            "collect creator submissions",
            "apply to create content",
            "submit a social post"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-fomoportal",
        "name": "Campus portal",
        "category": "Portals",
        "description": "A compact portal linking the main campus program journeys.",
        "sourcePath": "milomessina/fomoportal/index.html",
        "sourceUrl": "https://milomessina.com/fomoportal",
        "sourceAliases": [],
        "preview": "portal",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-fomoportal.jpg",
        "skeletonKey": "directory",
        "skeletonSections": [
          "Portal introduction",
          "Competition destination",
          "Team destination",
          "Dinner destination",
          "Creator destination"
        ],
        "tags": [
          "milo",
          "fomo",
          "campus",
          "portal",
          "directory",
          "program"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "blue",
            "purple",
            "green accent",
            "four cards",
            "card grid",
            "gradient accents"
          ],
          "features": [
            "portal",
            "program navigation",
            "competition link",
            "team link",
            "dinner link",
            "creator link"
          ],
          "phrases": [
            "put campus opportunities in one place",
            "choose a program from cards",
            "central campus portal"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-hq-visit-form",
        "name": "HQ visit form",
        "category": "Forms",
        "description": "The published HQ visit-request page with a compiled frontend.",
        "sourcePath": "milomessina-visit-requests/hqvisitform/index.html",
        "sourceUrl": "https://milomessina.com/hqvisitform",
        "sourceAliases": [],
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. This replaces the previous unverified prototype entry. A local feature checkout contains an earlier implementation; the current published bundle was verified separately.",
        "thumbnail": "/agencykit/thumbnails/milo-hq-visit-form.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Visit introduction",
          "Visit timing",
          "Guest details",
          "Review request",
          "Confirmation"
        ],
        "tags": [
          "milo",
          "fomo",
          "hq",
          "visit",
          "request",
          "appointment",
          "form"
        ],
        "relatedRoutes": [
          {
            "name": "Visit requests API",
            "url": "https://milomessina.com/api/visits",
            "kind": "endpoint",
            "httpStatus": 405,
            "notes": "HEAD returned 405. No visitor payload or mutating request was sent; this is an API route, not a page preview."
          }
        ],
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "split layout",
            "calendar",
            "stepper",
            "blue accents"
          ],
          "features": [
            "visit request",
            "date picker",
            "time selection",
            "calendar",
            "guest details",
            "review request"
          ],
          "phrases": [
            "calendar visit request",
            "request a time to visit HQ",
            "collect meeting preferences"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-visit-form-dev",
        "name": "Visit-form development entry",
        "category": "Forms",
        "description": "A separate development entry for the HQ visit form.",
        "sourcePath": "milomessina-visit-requests/visit-form/index.html",
        "sourceUrl": "https://milomessina.com/visit-form",
        "sourceAliases": [],
        "preview": "form",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. The route serves an HTML development shell loading main.tsx; it is not equivalent to the compiled /hqvisitform page, and its browser usability is not confirmed. Preview captured from the original frontend on 2026-09-30: Original visit-request prototype · local preview. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/milo-visit-form-dev.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Visit introduction",
          "Visit timing",
          "Guest details",
          "Review request",
          "Confirmation"
        ],
        "tags": [
          "milo",
          "fomo",
          "hq",
          "visit",
          "form",
          "development",
          "prototype"
        ],
        "previewSource": "local-original",
        "previewCaption": "Original visit-request prototype · local preview",
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "split layout",
            "calendar",
            "stepper",
            "blue accents"
          ],
          "features": [
            "visit request",
            "date picker",
            "time selection",
            "calendar",
            "guest details",
            "local prototype"
          ],
          "phrases": [
            "preview a visit request flow",
            "calendar visit request",
            "choose a preferred meeting time"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-arrivals",
        "name": "Parachute arrivals study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/arrivals-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/arrivals-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-arrivals.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Scene controls",
          "Arrival animation",
          "Variant comparison"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "parachute",
          "arrivals",
          "motion"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "green",
            "gray blue sky",
            "campus building",
            "spotlight",
            "game-like"
          ],
          "features": [
            "visual study",
            "arrival animation",
            "parachutes",
            "replay controls",
            "day and night",
            "pause"
          ],
          "phrases": [
            "preview parachute arrivals",
            "compare campus arrival animations",
            "test a game-like scene"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-banner",
        "name": "Village banner study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/banner-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/banner-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-banner.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Banner options",
          "Village preview",
          "Comparison controls"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "banner",
          "village",
          "branding"
        ],
        "searchMeta": {
          "visual": [
            "off white",
            "colorful",
            "black cards",
            "banner grid",
            "Greek letters",
            "large numbers"
          ],
          "features": [
            "visual study",
            "banner comparison",
            "chapter branding",
            "progress display",
            "reward display"
          ],
          "phrases": [
            "compare chapter banner designs",
            "show signup progress on a banner",
            "explore Greek letter graphics"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-campus-hill",
        "name": "Campus hill study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/campus-hill-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/campus-hill-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-campus-hill.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Terrain preview",
          "Campus scene",
          "View controls"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "campus",
          "hill",
          "terrain"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "green",
            "campus aerial",
            "brick buildings",
            "game-like"
          ],
          "features": [
            "visual study",
            "terrain preview",
            "campus scene",
            "camera views",
            "day and night",
            "pause"
          ],
          "phrases": [
            "inspect a virtual campus landscape",
            "compare campus camera views",
            "preview a campus quad"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-construction",
        "name": "Construction crew study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/construction-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/construction-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-construction.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Crew variants",
          "Construction scene",
          "Animation preview"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "construction",
          "crew",
          "animation"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "green",
            "building frame",
            "aerial view",
            "game-like"
          ],
          "features": [
            "visual study",
            "construction animation",
            "crew variants",
            "chapter selection",
            "playback controls"
          ],
          "phrases": [
            "preview a building under construction",
            "review construction crew animation",
            "compare construction variants"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-helipad",
        "name": "Helipad scene study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/helipad-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/helipad-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-helipad.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Scene overview",
          "Character placement",
          "Helipad preview"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "helipad",
          "scene",
          "characters"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "muted green",
            "helicopter",
            "helipad",
            "aerial view",
            "timeline bar"
          ],
          "features": [
            "visual study",
            "helicopter arrival",
            "camera shots",
            "character placement",
            "playback timeline",
            "day and night"
          ],
          "phrases": [
            "preview a helicopter arrival",
            "compare cinematic camera shots",
            "scrub a scene timeline"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-human",
        "name": "Campus people study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/human-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/human-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-human.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Character collection",
          "Figure variants",
          "Scale comparison"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "people",
          "human",
          "character"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "crowds",
            "campus buildings",
            "green",
            "close-up figures",
            "game-like"
          ],
          "features": [
            "visual study",
            "character variants",
            "crowd preview",
            "scale comparison",
            "camera views",
            "pause"
          ],
          "phrases": [
            "inspect a campus crowd",
            "compare low poly people",
            "preview characters at different scales"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-intro",
        "name": "Intro visual study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/intro-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/intro-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-intro.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Opening composition",
          "Scene layers",
          "Animation preview"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "intro",
          "opening",
          "motion"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "green",
            "campus aerial",
            "text overlay",
            "full screen scene",
            "game-like"
          ],
          "features": [
            "visual study",
            "intro composition",
            "reveal animation",
            "scene layers",
            "join action"
          ],
          "phrases": [
            "preview a campus intro",
            "place a call to action over a 3d scene",
            "review an opening reveal"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-leaderboard",
        "name": "Leaderboard study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/leaderboard-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/leaderboard-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-leaderboard.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Board composition",
          "Ranking rows",
          "Layout comparison"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "leaderboard",
          "ranking",
          "interface"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "3d",
            "scoreboard",
            "ranking rows",
            "white text",
            "gold accent"
          ],
          "features": [
            "visual study",
            "leaderboard",
            "rankings",
            "progress display",
            "mock data controls",
            "state comparison"
          ],
          "phrases": [
            "compare leaderboard states",
            "show chapter rankings on a board",
            "preview a 3d scoreboard"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-scale",
        "name": "Village scale study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/scale-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/scale-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-scale.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Large scene preview",
          "Density controls",
          "Scale comparison"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "scale",
          "performance",
          "village"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "green",
            "street view",
            "campus buildings",
            "crowds",
            "game-like"
          ],
          "features": [
            "visual study",
            "scene scale",
            "density controls",
            "camera views",
            "day and night",
            "activity pause"
          ],
          "phrases": [
            "compare a crowded campus scene",
            "test village scale",
            "inspect scene density"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-school-banner",
        "name": "School banner study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/school-banner-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/school-banner-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-school-banner.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "School options",
          "Banner collection",
          "Visual comparison"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "school",
          "banner",
          "identity"
        ],
        "searchMeta": {
          "visual": [
            "off white",
            "colorful",
            "banner grid",
            "school logos",
            "large letters",
            "serif heading"
          ],
          "features": [
            "visual study",
            "school branding",
            "banner comparison",
            "logo collection",
            "color palettes"
          ],
          "phrases": [
            "compare school banner designs",
            "browse campus branding variations",
            "show school colors"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-skyline",
        "name": "Campus skyline study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/skyline-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/skyline-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-skyline.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Architecture collection",
          "Skyline composition",
          "Scene preview"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "skyline",
          "architecture",
          "buildings"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "gray blue",
            "green",
            "building grid",
            "aerial view",
            "miniature buildings"
          ],
          "features": [
            "visual study",
            "architecture collection",
            "building selection",
            "camera views",
            "skyline comparison"
          ],
          "phrases": [
            "compare campus architecture",
            "browse miniature building models",
            "inspect a village skyline"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-stadium",
        "name": "Stadium scene study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/stadium-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/stadium-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-stadium.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Stadium composition",
          "Scene preview",
          "View controls"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "stadium",
          "sports",
          "scene"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "green",
            "purple seating",
            "football stadium",
            "aerial view",
            "game-like"
          ],
          "features": [
            "visual study",
            "stadium preview",
            "camera views",
            "day and night",
            "touchdown animation",
            "fireworks"
          ],
          "phrases": [
            "explore a virtual football stadium",
            "compare stadium camera angles",
            "preview stadium celebrations"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-study-vehicle",
        "name": "Village vehicle study",
        "category": "Tools",
        "description": "A public visual study used to review the Campus Wars scene.",
        "sourcePath": "milomessina/fomo/campuswars/tests/vehicle-gallery.html",
        "sourceUrl": "https://milomessina.com/fomo/campuswars/tests/vehicle-gallery.html",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "prototype",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. A design/test surface, not a production participant workflow. The neutral gallery starter uses placeholders rather than original source media.",
        "thumbnail": "/agencykit/thumbnails/milo-study-vehicle.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Vehicle collection",
          "Scene placement",
          "Visual comparison"
        ],
        "tags": [
          "milo",
          "fomo",
          "campuswars",
          "visual",
          "study",
          "prototype",
          "gallery",
          "vehicle",
          "cars",
          "village"
        ],
        "searchMeta": {
          "visual": [
            "3d",
            "low poly",
            "gray blue",
            "blue car",
            "minimal",
            "large canvas"
          ],
          "features": [
            "visual study",
            "vehicle variants",
            "model comparison",
            "sedan",
            "crossover",
            "shuttle"
          ],
          "phrases": [
            "compare village vehicle models",
            "preview a low poly car",
            "switch between vehicle types"
          ]
        },
        "sourceHost": "milomessina.com"
      }
    ],
    "client": "fomo"
  },
  {
    "id": "unassigned",
    "name": "Unassigned work",
    "client": null,
    "seedProject": false,
    "description": "Pages kept in the archive until they are associated with a client project.",
    "items": [
      {
        "id": "milo-home",
        "name": "Milo portfolio",
        "category": "Pages",
        "description": "A personal portfolio with featured work and a visual index of projects.",
        "sourcePath": "milomessina/index.html",
        "sourceUrl": "https://milomessina.com/",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-home.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Portfolio introduction",
          "Featured projects",
          "Visual project index",
          "Selected collaborations",
          "Contact and navigation"
        ],
        "tags": [
          "milo",
          "portfolio",
          "projects",
          "personal",
          "home",
          "gallery"
        ],
        "relatedRoutes": [
          {
            "name": "Commit metadata API",
            "url": "https://milomessina.com/api/commits",
            "kind": "endpoint",
            "httpStatus": 200,
            "notes": "Metadata-only HEAD check; JSON payload not fetched."
          }
        ],
        "searchMeta": {
          "visual": [
            "retro desktop",
            "Mac inspired",
            "mountain wallpaper",
            "overlapping windows",
            "dock icons",
            "large typography"
          ],
          "features": [
            "portfolio",
            "project index",
            "featured work",
            "contact links",
            "desktop navigation"
          ],
          "phrases": [
            "show a personal portfolio",
            "browse projects in desktop windows",
            "retro computer website"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-photos",
        "name": "Photography",
        "category": "Pages",
        "description": "A photography gallery with a focused image-browsing experience.",
        "sourcePath": "milomessina/photos/index.html",
        "sourceUrl": "https://milomessina.com/photos",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-photos.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Gallery navigation",
          "Photo grid",
          "Image viewer",
          "Previous and next image"
        ],
        "tags": [
          "milo",
          "photography",
          "photos",
          "images",
          "gallery"
        ],
        "searchMeta": {
          "visual": [
            "retro desktop",
            "Mac inspired",
            "mountain wallpaper",
            "photo grid",
            "file icons",
            "dock icons"
          ],
          "features": [
            "photography gallery",
            "image browsing",
            "image viewer",
            "previous and next navigation"
          ],
          "phrases": [
            "browse a photo collection",
            "photography as desktop files",
            "open images in a gallery"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-cars",
        "name": "The Garage",
        "category": "Pages",
        "description": "A vehicle showcase combining a collection view and interactive model presentation.",
        "sourcePath": "milomessina/cars/index.html",
        "sourceUrl": "https://milomessina.com/cars",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-cars.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Garage introduction",
          "Vehicle collection",
          "Model viewer",
          "Vehicle details",
          "Collection navigation"
        ],
        "tags": [
          "milo",
          "cars",
          "garage",
          "vehicles",
          "3d",
          "collection",
          "gallery"
        ],
        "searchMeta": {
          "visual": [
            "light",
            "gray",
            "white",
            "3d",
            "car models",
            "minimal",
            "large canvas"
          ],
          "features": [
            "vehicle collection",
            "model viewer",
            "car selection",
            "model rotation",
            "collection navigation"
          ],
          "phrases": [
            "browse a virtual garage",
            "interactive 3d car viewer",
            "showcase vehicle models"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-car-model-sources",
        "name": "Garage model sources",
        "category": "Tools",
        "description": "A reference directory for the garage models and visual presentation.",
        "sourcePath": "milomessina/cars/model-sources.html",
        "sourceUrl": "https://milomessina.com/cars/model-sources.html",
        "sourceAliases": [],
        "preview": "directory",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. ",
        "thumbnail": "/agencykit/thumbnails/milo-car-model-sources.jpg",
        "skeletonKey": "directory",
        "skeletonSections": [
          "Source collection",
          "Model references",
          "Attribution links",
          "Lighting study"
        ],
        "tags": [
          "milo",
          "cars",
          "models",
          "sources",
          "references",
          "directory"
        ],
        "searchMeta": {
          "visual": [
            "dark",
            "green",
            "text table",
            "dense rows",
            "underlined links"
          ],
          "features": [
            "reference directory",
            "model sources",
            "attribution",
            "status table",
            "resource links"
          ],
          "phrases": [
            "find model source credits",
            "compare vehicle model references",
            "organize resource links"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-arya",
        "name": "Spatial studio",
        "category": "Pages",
        "description": "A spatial studio page presenting a scanned office environment.",
        "sourcePath": "Published route: milomessina.com/arya",
        "sourceUrl": "https://milomessina.com/arya",
        "sourceAliases": [],
        "preview": "gallery",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The live page returned HTTP 200 with its expected title on 2026-09-29; submissions were not tested. No matching file exists in the inspected local checkouts; this entry is based on the published route and page headings.",
        "thumbnail": "/agencykit/thumbnails/milo-arya.jpg",
        "skeletonKey": "gallery",
        "skeletonSections": [
          "Spatial introduction",
          "Room preview",
          "Scan navigation",
          "Scene details"
        ],
        "tags": [
          "milo",
          "arya",
          "spatial",
          "studio",
          "office",
          "3d",
          "gallery"
        ],
        "searchMeta": {
          "visual": [
            "light",
            "white",
            "gray",
            "3d",
            "dollhouse view",
            "cutaway",
            "side controls"
          ],
          "features": [
            "room scan viewer",
            "spatial navigation",
            "floor plan",
            "view modes",
            "cutaway controls"
          ],
          "phrases": [
            "explore a scanned office",
            "show a room in 3d",
            "switch between dollhouse and floor plan"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-visit-console",
        "name": "Operations console",
        "category": "Portals",
        "description": "An internal operations console referenced without any real records.",
        "sourcePath": "milomessina/invoice/index.html",
        "sourceUrl": "https://milomessina.com/internal",
        "sourceAliases": [
          "https://milomessina.com/invoice"
        ],
        "preview": "dashboard",
        "status": "protected",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The route returned HTTP 200 to a metadata-only HEAD check; private page bodies and records were not fetched. The /invoice alias has the same ETag and local routing maps both to the same console. The earlier visit-request prototype entry is retained under this ID as a general console reference; its live visit-specific view was not inspected. Preview captured from the original frontend on 2026-09-30: Original operations console · access screen. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/milo-visit-console.jpg",
        "skeletonKey": "invoice",
        "skeletonSections": [
          "Access gate",
          "Operations overview",
          "Invoice records",
          "Record details",
          "Review actions",
          "Status filters"
        ],
        "tags": [
          "milo",
          "fomo",
          "internal",
          "operations",
          "invoice",
          "console",
          "review"
        ],
        "previewSource": "public-original",
        "previewCaption": "Original operations console · access screen",
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "minimal",
            "centered card",
            "soft shadow",
            "purple button",
            "passcode input"
          ],
          "features": [
            "access screen",
            "login",
            "name selection",
            "passcode gate",
            "operations console",
            "invoice management"
          ],
          "phrases": [
            "open the internal operations console",
            "team login screen",
            "access invoice operations"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-invoice-beta",
        "name": "Beta internship",
        "category": "Forms",
        "description": "A guided two-week internship onboarding journey with a welcome, participant details, schedule, and review.",
        "sourcePath": "Published route: milomessina.com/internal/beta",
        "sourceUrl": "https://milomessina.com/internal/beta",
        "sourceAliases": [
          "https://milomessina.com/invoice/beta.html"
        ],
        "preview": "form",
        "status": "prototype",
        "notes": "Original public beta internship welcome page, verified on 2026-09-30. Preview shows the initial step; no participant details were entered and no application was submitted.",
        "thumbnail": "/agencykit/thumbnails/milo-invoice-beta.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Internship introduction",
          "Participant details",
          "Two-week schedule",
          "Review and join"
        ],
        "tags": [
          "beta",
          "internship",
          "onboarding",
          "application",
          "schedule",
          "team"
        ],
        "previewSource": "public-original",
        "previewCaption": "Original beta internship · welcome step",
        "searchMeta": {
          "visual": [
            "white",
            "light",
            "lavender",
            "centered card",
            "soft shadow",
            "stepper",
            "purple button"
          ],
          "features": [
            "internship onboarding",
            "participant details",
            "schedule",
            "two-week plan",
            "review and join"
          ],
          "phrases": [
            "onboard an intern",
            "show a two week internship plan",
            "guide participants through joining"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "milo-chapter-data",
        "name": "Chapter analytics",
        "category": "Tools",
        "description": "An internal chapter analytics workspace, previewed at its original access screen.",
        "sourcePath": "milomessina/invoice/data/index.html",
        "sourceUrl": "https://milomessina.com/invoice/data",
        "sourceAliases": [],
        "preview": "dashboard",
        "status": "protected",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. The route returned HTTP 200 to a metadata-only HEAD check; private page bodies and records were not fetched. Local source confirms a visual analytics page rather than an API endpoint. No chapter records, metrics, contact information, or charts of real data are included. Preview captured from the original frontend on 2026-09-30: Original chapter analytics · access screen. No private records or credentials are included.",
        "thumbnail": "/agencykit/thumbnails/milo-chapter-data.jpg",
        "skeletonKey": "relationship-workspace",
        "skeletonSections": [
          "Access gate",
          "Chapter overview",
          "Campus map",
          "Group comparisons",
          "Chapter table",
          "Summary views"
        ],
        "tags": [
          "milo",
          "fomo",
          "chapter",
          "analytics",
          "data",
          "map",
          "internal"
        ],
        "previewSource": "public-original",
        "previewCaption": "Original chapter analytics · access screen",
        "searchMeta": {
          "visual": [
            "dark",
            "black",
            "minimal",
            "centered form",
            "passcode input",
            "blue button"
          ],
          "features": [
            "access screen",
            "passcode gate",
            "chapter analytics",
            "campus comparisons",
            "chapter table"
          ],
          "phrases": [
            "access chapter analytics",
            "open an internal data workspace",
            "minimal dark access screen"
          ]
        },
        "sourceHost": "milomessina.com"
      },
      {
        "id": "bijan-build-request",
        "name": "Build request",
        "category": "Forms",
        "description": "A staged project brief that collects an idea, requirements, timing, and budget before review.",
        "sourcePath": "bijanizadian.com/build.html",
        "sourceUrl": "https://bijanizadian.com/build",
        "preview": "form",
        "status": "finished",
        "notes": "Source design with a neutral frontend starter. Real authentication, data, and backend services require separate integration. Live URL returned HTTP 200 with the expected title on 2026-09-29. form submissions and private records were not tested. Only the public intake entry is represented. The submission dashboard and stored requests were not opened or copied.",
        "thumbnail": "/agencykit/thumbnails/bijan-build-request.jpg",
        "skeletonKey": "application-form",
        "skeletonSections": [
          "Project introduction",
          "Contact details",
          "Idea and requirements",
          "Timing and budget",
          "Review brief",
          "Send and confirmation"
        ],
        "tags": [
          "build",
          "project",
          "intake",
          "brief",
          "request",
          "client",
          "budget"
        ],
        "searchMeta": {
          "visual": [
            "light",
            "warm gray",
            "off white",
            "minimal",
            "centered card",
            "serif heading",
            "green button"
          ],
          "features": [
            "project intake",
            "multi-step form",
            "project brief",
            "requirements",
            "timing",
            "budget",
            "review"
          ],
          "phrases": [
            "collect a website project brief",
            "turn an idea into a build request",
            "ask about scope timing and budget"
          ]
        },
        "sourceHost": "bijanizadian.com"
      }
    ]
  }
];
