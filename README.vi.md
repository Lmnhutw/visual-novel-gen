# Narrative Studio

[English](README.md) | **Tiếng Việt**

Ứng dụng Next.js hỗ trợ lập kế hoạch truyện, sinh văn bản, truy xuất ngữ cảnh,
ghi nhớ dữ kiện, kiểm tra tính nhất quán và đọc bản thảo.

Stack hiện tại gồm Next.js, React, TypeScript, Prisma, PostgreSQL (Supabase hoặc
Docker local), schema hỗ trợ pgvector và adapter OpenRouter ở server. Mặc định
không chạy LLM local. Xem [định tuyến model](#model-calls) để hiểu model mặc định
trong code và các bước có thể phát sinh phí.

## Đọc kiến trúc và các flow chính

Phần [hướng dẫn kiến trúc](#architecture-guide) gồm 9 sơ đồ và liên kết tới source:

1. [Kiến trúc và ranh giới trách nhiệm](#system-overview)
2. [Hành trình sử dụng, Story và nhân vật](#user-flow)
3. [Tạo bản nháp từ UI đến worker và LLM](#generation-flow)
4. [Retrieval, context budget và prompt](#context-prompt)
5. [Trạng thái job, hủy, retry và fallback trả phí](#job-lifecycle)
6. [Duyệt draft và ghi vào bản thảo](#draft-acceptance)
7. [Continuity, memory và duyệt canon](#canon-review)
8. [Viết tiếp, kết thúc và chuyển chương](#chapter-loop)
9. [Mô hình dữ liệu và đường đọc Reader](#core-data)

Liên kết ngôn ngữ chuyển giữa hai file README hoàn chỉnh và bộ sơ đồ tương ứng.
Đây là lựa chọn ngôn ngữ tài liệu, không phải thiết lập ngôn ngữ của ứng dụng.
Hai bản mô tả code trong repository, không khẳng định production hoặc model
bên ngoài đã được kiểm thử trực tiếp.

## Cài đặt local

1. Copy `env/.env.example` thành `env/.env.local`.
2. Điền kết nối database, khóa Supabase khi cần và `OPENROUTER_API_KEY`.
3. Cài dependency, tạo Prisma client và chạy migration:

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
```

`prisma:migrate` là lệnh tương tác dành cho local development. Khi triển khai,
áp dụng migration đã commit, không tạo migration mới:

```bash
node run-with-project-env.mjs prisma migrate deploy
```

Kiểm tra kết nối Supabase, sau đó khởi động ứng dụng:

```bash
npm run supabase:check
npm run dev
```

Nếu chạy ngoài Docker, mở worker ở terminal khác để queue không phụ thuộc
vào browser kích hoạt thực thi:

```bash
npm run generation:worker
```

Các lệnh kiểm tra:

```bash
npm run typecheck
npm test
npm run lint
```

## Docker cho local development

Compose khởi động Next.js, PostgreSQL với pgvector và generation worker.
Copy `env/.env.example` thành `env/.env`, điền ít nhất `OPENROUTER_API_KEY`, rồi chạy:

```bash
docker compose up --build
```

Mở `http://localhost:3000`. Compose cung cấp URL database local. Migration chạy
sau khi database vượt health check; source được mount và tự reload khi thay đổi.
Nhấn `Ctrl+C` để dừng. Dữ liệu được giữ trong volume `postgres_data`.

Để xóa database Compose local và bắt đầu lại:

```bash
docker compose down -v
```

Lệnh này xóa các volume Compose và dữ liệu trong đó. Không dùng stack development
này để lưu dữ liệu production. Có thể tiếp tục dùng Supabase khi chạy ngoài Docker.

## Biến môi trường

Các npm script local đọc `env/.env.local` trước, rồi `env/.env`. Biến đã có trong
shell, CI hoặc Docker được ưu tiên. Test runner chỉ nạp biến kết nối database từ
các file này, không nạp cấu hình tính năng local.

File mẫu chỉ chứa placeholder, không có secret:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
GENERATION_MODEL=qwen/qwen-2.5-72b-instruct
FREE_GENERATION_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
PAID_FALLBACK_MODEL=qwen/qwen-2.5-72b-instruct
EVALUATION_MODEL=
EXTRACTION_MODEL=
GENERATION_WORKER_POLL_MS=5000

ENABLE_EMBEDDINGS=false
REQUIRE_AUTH=false

DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Không commit `env/.env`, `env/.env.local` thật hoặc file secret production.
Cấu hình mẫu dùng `REQUIRE_AUTH=false` để làm việc với dữ liệu chưa gán ở môi
trường phát triển tin cậy. Xem [thiết lập tài khoản và chuyển dữ liệu cũ](docs/SETUP.md#account-setup-and-legacy-data).

## Story, Library và URL Reader

Mỗi Story có `stories.slug` duy nhất được tạo từ tên truyện. Slug trùng nhận hậu
tố như `test2-2`. CUID vẫn là ID nội bộ cho API; Reader dùng slug và số chương:

```text
/library/story?story=the-last-heir-of-the-forgotten-realm
/library/story?story=the-last-heir-of-the-forgotten-realm&chapter=2
```

Các liên kết CUID cũ hoặc title-plus-ID được resolve rồi redirect sang URL slug
chuẩn. Migration `0013_story_slugs` điền slug cho truyện cũ và thêm unique index.

Library hiện skeleton toàn nội dung lúc tải đầu tiên. Khi đổi Story, danh sách
vẫn hiển thị nhưng tạm chặn tương tác; phần preview chuyển sang skeleton.
Nếu tải Story lỗi, ứng dụng kết thúc loading và hiện thông báo lỗi.

## Retrieval và Writing Harness

PostgreSQL là nguồn dữ liệu chuẩn. Schema pgvector và code tìm vector đã có,
nhưng `embedText()` của adapter OpenRouter hiện ném lỗi chưa hỗ trợ.
Chỉ bật `ENABLE_EMBEDDINGS=true` không làm semantic retrieval hoạt động; tìm memory
sẽ fallback về keyword, độ quan trọng, độ mới và trọng số cảm xúc.

Context mặc định dùng ngân sách ước lượng 6.000 token. Dữ liệu bắt buộc có thể
vượt mức này; preview hiển thị `overBudget` và số bản ghi bị bỏ. Đây không phải
giới hạn cứng của toàn bộ prompt gửi provider. Xem [cách ghép context](#context-prompt).

Mỗi Story lưu Harness có version tại `story_settings.writing_harness`: ngôn ngữ,
độ dễ đọc, mục tiêu phong cách, quy tắc bắt buộc, ký tự/cụm từ cấm, độ dài câu
gợi ý, quy tắc prose/Markdown, dòng trống và chính sách repair. Settings cũ rỗng
dùng bộ mặc định version 1; khi lưu sẽ giữ toàn bộ snapshot đã validate.
`styleGuide` là mục tiêu mềm bổ sung.

Generation biên dịch cấu hình thành chỉ dẫn, chuẩn hóa prose và kiểm tra các hard
rule được hỗ trợ. Nếu bật repair và được phép, cùng model sửa tập trung tối đa
một lần. Còn vi phạm thì giữ kết quả ở `needs_review`. Cấu hình hiệu lực, version
prompt, findings, lần repair/model và kết quả được lưu trong input của run,
snapshot context/prompt của job và metadata draft. Ngôn ngữ, phong cách, độ dài
câu và chỉ dẫn tự do không được bảo đảm đầy đủ bằng kiểm tra cơ học.

## Generation job và quyền sở hữu

Studio lưu `generation_jobs` trước khi thực thi. Worker claim nguyên tử rồi lưu
draft/proposal để duyệt. Job lỗi hoặc bị hủy có thể retry trên cùng bản ghi.
Update stage/kết quả có điều kiện ngăn response đến muộn ghi đè job đã hủy.

Studio và Reader dùng cookie phiên Supabase đã xác minh. API cũng nhận bearer
token Supabase. Truy cập truyện được giới hạn theo `stories.owner_id`.
Ứng dụng mặc định yêu cầu đăng nhập và luôn yêu cầu trên production. Với
`REQUIRE_AUTH=false` ở môi trường phát triển, phiên chưa đăng nhập chỉ thấy truyện
chưa gán và mẫu nhân vật local. Các bảng public giữ RLS mặc định từ chối, còn
Prisma truy cập dữ liệu trên server.

## Duyệt canon và tái sử dụng nhân vật

Canon phân biệt mâu thuẫn, đề xuất dữ kiện mới và ghi chú biên tập. P0 còn mở
chặn accept draft; P1 còn mở cần explicit override. Resolve hoặc dismiss bỏ issue
khỏi các gate này, nhưng mature-content issue không được dismiss.
Proposal/advisory không chặn accept draft. Sau khi người dùng duyệt, chỉ proposal
Memory/Event được ghi tự động; các loại khác cần áp dụng thủ công.

`character_templates` giữ hồ sơ dùng lại theo owner. Copy vào Story tạo Character
độc lập, không copy memory, quan hệ, bí mật, lịch sử scene hoặc canon.
`source_template_id` chỉ là metadata nguồn gốc; xóa template không xóa nhân vật
đã copy.

Story có thể có nhiều protagonist và một primary protagonist tùy chọn. Primary
phải là `PROTAGONIST` trong cùng Story. Xóa nhân vật sẽ xóa tham chiếu; đổi vai trò
bị từ chối đến khi bỏ hoặc chuyển chỉ định primary. Lựa chọn POV/active tường minh
được ưu tiên. Danh sách active rỗng ngăn primary fallback, nhưng retrieval coi bộ
lọc rỗng là tất cả nhân vật của Story, trong giới hạn query và ngân sách context.

<a id="architecture-guide"></a>
## Hướng dẫn kiến trúc và luồng chức năng

Phạm vi: tài liệu cho người cần hiểu và bảo trì Narrative Studio. Đây là ứng dụng
hỗ trợ lập kế hoạch, viết và đọc truyện; các flow bên dưới xoay quanh bản thảo văn
bản, không phải runtime game visual novel. Không suy đoán số người dùng hoặc SLA
production từ cấu hình local.

Thuật ngữ cần phân biệt:

| Khái niệm | Vai trò trong ứng dụng |
| --- | --- |
| Story / canon | Truyện và các sự thật đã lưu: nhân vật, quan hệ, sự kiện, lore, bí mật, plot thread |
| Chapter / Scene | Chương và các đoạn bản thảo được xếp thứ tự trong chương |
| DraftVersion | Bản nháp để sửa và duyệt; sinh xong chưa đồng nghĩa đã vào bản thảo |
| Chapter Brief | Ý định ban đầu, tiến độ, các diễn biến đã hoàn tất, dữ kiện và hướng viết tiếp của chương |
| Memory | Dữ kiện hồi tưởng được lưu trong DB, hỗ trợ retrieval; không phải bộ nhớ nội tại của model |
| Writing Harness | Cấu hình cách viết theo Story, được biên dịch thành prompt và kiểm tra đầu ra |
| GenerationJob / GenerationRun | Job bền vững để điều phối và bản ghi lần chạy model; trạng thái của chúng khác nhau |

<a id="system-overview"></a>
### 1. Kiến trúc và ranh giới trách nhiệm

![Kiến trúc: UI, API, services, worker, PostgreSQL và OpenRouter](docs/diagrams/01-architecture.svg)

Hệ thống có cấu trúc **modular monolith**: Next.js chứa UI và API; các service
nghiệp vụ nằm trong `lib/`. Worker là process riêng dùng cùng code và database.
Đây là pipeline có thứ tự cố định; model không tự chọn tool hay điều phối agent.

| Thành phần | Trách nhiệm và source cần đọc |
| --- | --- |
| Presentation | [`WriterStudio`](components/workspace/studio/writer-studio.tsx) giữ state workspace, gọi API và poll job; các panel hiển thị form, context và review |
| API boundary | [`app/api/`](app/api/) parse input bằng Zod, xác thực/ownership, gọi service, trả JSON hoặc lỗi |
| Application services | [`lib/stories/`](lib/stories/), [`lib/characters/`](lib/characters/), [`lib/chapters/`](lib/chapters/), [`lib/generation/`](lib/generation/) quản lý workflow và transaction |
| AI pipeline | [`generation-pipeline.ts`](lib/generation/generation-pipeline.ts) dùng chung cho generation trực tiếp và queued job |
| Infrastructure | [`Prisma`](lib/db/prisma.ts), [`OpenRouterProvider`](lib/ai/openrouter.ts), [`ownership.ts`](lib/security/ownership.ts) |
| Worker | [`run-generation-worker.ts`](scripts/run-generation-worker.ts) poll DB, mặc định 5 giây; mỗi lượt lấy tối đa 1 job |
| Deployment local | [`compose.yaml`](compose.yaml): app + worker + PostgreSQL/pgvector, lưu DB bằng volume |

PostgreSQL vừa giữ dữ liệu nghiệp vụ vừa giữ queue. Chưa cần thêm Redis, queue
broker, vector database riêng, framework agent hoặc microservices để giải thích
hay chạy các flow hiện có.

<a id="user-flow"></a>
### 2. Hành trình sử dụng, Story và nhân vật

![Luồng chọn truyện, chuẩn bị nhân vật, viết, duyệt và đọc](docs/diagrams/02-user-flow.svg)

`/` chuyển tới `/library`. Library dùng `WriterStudio` để chọn/tạo Story và mở các
khu vực viết, nhân vật, canon và cấu hình. Tạo Story đồng thời tạo settings và slug
duy nhất; slug phục vụ URL Reader, còn API nghiệp vụ vẫn dùng ID nội bộ.

Nhân vật có hai phạm vi: **Character Template** tái sử dụng theo owner và
**Character** thuộc một Story. Thêm template vào Story tạo bản sao hồ sơ độc lập;
không mang theo memory, quan hệ hay lịch sử. Xóa template không xóa nhân vật đã
copy. Random hồ sơ dùng dữ liệu/template và hàm random trong
[`lib/character-generation/`](lib/character-generation/), không gọi LLM.

Primary protagonist là nhân vật `PROTAGONIST` của cùng Story. Nó làm giá trị dự
phòng khi xác định POV/nhân vật; lựa chọn tường minh của người viết được ưu tiên.
Đọc [`resolveNarrativeFocus`](lib/generation/narrative-focus.ts) và
[`character-template-service.ts`](lib/characters/character-template-service.ts).

<a id="generation-flow"></a>
### 3. Tạo bản nháp từ UI đến worker và LLM

![Sequence tạo job, chạy pipeline, lưu draft và trả kết quả](docs/diagrams/03-generation-sequence.svg)

1. UI gọi `POST /api/generation/jobs` với Story, goal, chương, POV, active characters
   và các tùy chọn. Server kiểm tra scope, điều kiện mature-content và hard word
   limit, chọn/tạo chương đang hoạt động và khởi tạo Brief nếu thiếu.
2. `createGenerationJob` lưu job trước khi gọi model. Cùng `storyId` và
   `idempotencyKey` sẽ dùng lại job; unique constraint xử lý request trùng đồng thời.
3. Worker hoặc `POST /api/generation/jobs/:id/run` claim bằng update có điều kiện.
   Chỉ process claim được mới chạy. UI hiện cũng gọi endpoint run sau khi tạo job;
   production cần worker để queue tiếp tục được xử lý khi không có browser.
4. Pipeline chuẩn bị context/prompt, sinh prose, kiểm tra Harness, sửa tối đa một
   lần nếu được phép, kiểm tra continuity và trích xuất đề xuất có schema.
5. Transaction ghi DraftVersion, issues, proposals, kết quả run và job
   `READY_FOR_REVIEW`. Browser poll danh sách job mỗi 1.8 giây khi còn job hoạt động.

`GenerationRun.SUCCEEDED` nghĩa là có kết quả đã lưu, không bảo đảm draft vượt mọi
kiểm tra. Draft vẫn có thể cần review. Nếu extraction lỗi, draft được giữ và lỗi
được audit; nếu LLM continuity lỗi, rule checks vẫn chạy và thêm cảnh báo checker.

API `POST /api/generation/scene`, `/api/generation/chapter` và
`/api/chapters/:id/revise` dùng chung pipeline nhưng chạy trong request qua
[`generation-service.ts`](lib/generation/generation-service.ts). Nhánh này trả
draft/extraction candidates, không tạo đầy đủ job, DraftVersion và queue proposals
như nhánh Studio. `previewOnly` chuẩn bị prompt/context mà không gọi model sinh prose;
nó vẫn có thể đọc DB và đi qua retrieval.

<a id="model-calls"></a>
#### Model được gọi ở đâu, có thể tốn phí lúc nào?

| Bước | Cấu hình chọn model trong code |
| --- | --- |
| Viết draft ban đầu, kể cả generation trực tiếp | `FREE_GENERATION_MODEL`, mặc định `nvidia/nemotron-3-ultra-550b-a55b:free` |
| Fallback viết draft của queued job | `PAID_FALLBACK_MODEL`, mặc định `qwen/qwen-2.5-72b-instruct`; cần duyệt trong thời hạn |
| Repair Writing Harness | Cùng model đang viết, tối đa một request repair; paid repair chỉ được bật cho paid attempt đã xác nhận |
| LLM continuity review | `EVALUATION_MODEL`; rỗng thì dùng `GENERATION_MODEL` |
| Trích xuất memory/canon/Brief | `EXTRACTION_MODEL`; rỗng thì dùng `GENERATION_MODEL` |
| Summarize chương | Provider mặc định, tức `GENERATION_MODEL` |

**Bước viết miễn phí không bảo đảm toàn bộ job miễn phí.** Evaluation và extraction
có routing riêng, mặc định có thể dùng model trả phí mà không đi qua hộp xác nhận
fallback của bước viết. Tên model ở đây là mặc định trong source, không phải xác
nhận model đó còn khả dụng hoặc giá hiện tại trên OpenRouter.

Adapter gọi `/chat/completions` bằng `fetch`, không streaming; mặc định timeout fetch 60
giây và 2 retry sau lần đầu. Timer được xóa khi `fetch` trả về; đây không phải
deadline cho toàn bộ response body hoặc cả job. JSON output dùng `response_format`, parse JSON
và Zod; schema không hợp lệ mặc định thử lại thêm 1 lần, cấu hình tối đa 2. Retry
ở tầng provider và tầng schema có thể làm tổng số request lớn hơn số bước trên sơ đồ.

<a id="context-prompt"></a>
### 4. Retrieval, context budget và prompt

![Luồng lấy canon, xếp hạng memory, chọn context và dựng prompt](docs/diagrams/04-context-prompt.svg)

[`retrieveContext`](lib/retrieval/retrieval-service.ts) đọc Story/settings,
characters/profile/state, relationships/history, events, lore, secrets/knowledge,
unresolved threads, Chapter Brief và Scene gần nhất. Memory được tìm theo Story
và goal; xếp hạng keyword kết hợp độ quan trọng, độ mới và cảm xúc. Nếu truy xuất
memory lỗi ở tầng context, có fallback lấy memory theo salience/recency.

[`applyContextBudget`](lib/retrieval/context-budget.ts) ước lượng token bằng độ dài
ký tự, mặc định 6.000 và giới hạn cấu hình 1.000–20.000. Story/settings/chapter và
required characters được giữ trước; tối đa 3 Scene đã duyệt, mỗi Scene lấy tối đa
4.000 ký tự cuối, rồi các mục tùy chọn được chọn vào phần ngân sách còn lại. Khi
required data quá lớn, `overBudget=true`; đây không phải tokenizer thật hay quota
cứng của toàn bộ prompt. Task, system instructions và prose đầu ra có chi phí riêng.

[`buildGenerationPrompt`](lib/prompts/prompt-builder.ts) ghép một chuỗi prompt:

```text
System / canon protection
Mature Content Rules (khi áp dụng)
Writing Harness: required rules, deterministic rules, style goals
Story / settings / approved manuscript / characters / relationships
Timeline / lore / secrets và knowledge / threads / memories / chapter brief
Previous draft (nếu có), chapter closing budget và continuation instructions
Task: mode, goal, scene goal, POV
Output contract: prose theo cấu hình
```

Thứ tự ưu tiên được chỉ dẫn trong nội dung prompt. Adapter mặc định gửi chuỗi đó
trong **một message `role: user`**; các heading `System` không phải các message role
tách riêng. Ownership và ghi dữ liệu vẫn do code server quyết định.

Harness không phải skill Codex và không tự học sau mỗi lần viết. Nó là snapshot
cấu hình theo Story. Các hard rule được kiểm tra trong code; độ dài câu, ngôn ngữ,
style goals và free-form instructions không có bảo đảm kiểm tra cơ học đầy đủ.

<a id="job-lifecycle"></a>
### 5. Trạng thái job, hủy, retry và fallback

![State diagram của generation job](docs/diagrams/05-job-lifecycle.svg)

`status` là vòng đời job; `stage` là bước nhỏ để UI hiển thị tiến độ:

```text
RETRIEVING_CONTEXT → BUILDING_PROMPT → GENERATING → VALIDATING_HARNESS
→ REPAIRING_HARNESS (nếu cần) → CHECKING_CONTINUITY
→ EXTRACTING_BRIEF_AND_CANON → SAVING_DRAFT → bước review tương ứng
```

Khi model viết miễn phí gặp lỗi đủ điều kiện (timeout, connection, HTTP 408/429/5xx
hoặc output rỗng), job dừng ở `AWAITING_FALLBACK_CONFIRMATION`. Người dùng có 5 phút
để duyệt model trả phí. Từ chối sẽ hủy; worker đổi các xác nhận đã hết hạn thành
`CANCELLED` ở lượt poll sau. Retry từ `FAILED`/`CANCELLED` dùng lại job và bắt đầu
lại nhánh miễn phí, không tự giữ phê duyệt trả phí của lần trước.

Hủy job đổi trạng thái trong DB; request sinh prose của job theo dõi hủy bằng
AbortSignal và các checkpoint kiểm tra lại trạng thái. Update cuối chỉ được phép
khi job còn `RUNNING`, nên response đến muộn không ghi đè job đã hủy. Việc hủy
không bảo đảm nhà cung cấp chưa tính phí hoặc các lời gọi review/extraction đang
chạy được dừng ngay.

Source: [`generation-job-service.ts`](lib/generation/generation-job-service.ts),
[`job-state.ts`](lib/generation/job-state.ts),
[`openrouter.ts`](lib/ai/openrouter.ts).

<a id="draft-acceptance"></a>
### 6. Duyệt draft và ghi vào bản thảo

![Luồng kiểm tra và commit DraftVersion thành Scene](docs/diagrams/06-draft-acceptance.svg)

Save draft chỉ sửa DraftVersion chưa commit. Accept gọi
`POST /api/draft-versions/:id/accept` rồi
[`commitDraftToChapter`](lib/chapters/chapter-service.ts):

- Nếu có đề xuất Brief, phải gửi quyết định approve hoặc discard; approve dùng
  bản cập nhật người viết đã duyệt, discard giữ Brief hiện tại.
- Hard Harness violations phải được sửa. P0 còn mở chặn commit; P1 cần resolve,
  dismiss hoặc explicit override. Mature-content issues không được dismiss.
- Nội dung phải có từ, chương phải đang mở và tổng từ sau commit không vượt hard
  limit. Nội dung rỗng trả 422; xung đột review/chương/word limit trả 409. Các kiểm
  tra chạy lại ở server, không chỉ dựa vào trạng thái nút trên UI.
- Serializable transaction tạo Scene theo số thứ tự, đánh dấu draft `ACCEPTED`,
  tăng word/token count và cập nhật Brief được duyệt. Xung đột transaction được
  thử tối đa 3 lần tổng cộng (lần đầu và tối đa 2 retry); draft đã commit trả lại
  Scene cũ khi accept lặp.

Sau commit, lịch sử draft đã gắn Scene không được sửa qua endpoint save draft.
Accept bản nháp và accept canon là hai quyết định riêng biệt.

<a id="canon-review"></a>
### 7. Continuity, memory và duyệt canon

![Luồng đề xuất canon qua người duyệt tới database](docs/diagrams/07-canon-review.svg)

Continuity so draft với canon bằng rule checks và LLM review có schema. UI phân
biệt contradiction, đề xuất dữ kiện mới và advisory. Không coi mọi chi tiết mới
là mâu thuẫn. `evaluateDraft` tổng hợp severity: có P0 thì đề nghị viết lại, có P1
thì cần review, còn lại pass; quyền commit vẫn chịu các gate ở phần 6.

Extraction trả memory, events, state/relationship changes, secrets, lore, threads
và Chapter Brief update. Với queued job, các dữ kiện canon thành proposal
`PENDING`; **không tự thay canon chỉ vì LLM trả về chúng**.

Sau khi draft đã `ACCEPTED`, người viết có thể accept từng proposal:

- Memory/Event có `AUTO_APPLY`: transaction ghi bản ghi tương ứng, cập nhật
  proposal `ACCEPTED` và audit. `AUTO_APPLY` ở đây vẫn cần người dùng bấm accept.
- State, relationship, secret, lore, thread: chuyển
  `NEEDS_MANUAL_APPLICATION`; endpoint này chưa tự áp dụng dữ liệu vào các bảng đó.
- Reject chỉ đánh dấu từ chối và audit. Proposal không chặn accept draft.

Chapter Brief update đi theo quyết định khi accept draft, không đi qua queue canon
này. Ngoài ra, API tiện ích `POST /api/memories/extract` có nhánh `persist=true`
ghi memory trực tiếp; không nên nhầm nó với quy trình duyệt của Studio.

Source: [`continuity-service.ts`](lib/continuity/continuity-service.ts),
[`memory-extractor.ts`](lib/memory/memory-extractor.ts),
[`reviewCanonChangeProposal`](lib/generation/generation-job-service.ts).

<a id="chapter-loop"></a>
### 8. Viết tiếp, kết thúc và chuyển chương

![Vòng lặp generate, review, commit và handoff sang chương mới](docs/diagrams/08-chapter-loop.svg)

Mặc định target/soft/hard limit là **5.000 / 5.500 / 6.000 từ** và auto-advance bật.
Mode tự động chuyển sang `CLOSING` khi đạt soft limit hoặc chỉ còn tối đa 1.200 từ
trước hard limit; vì vậy với mặc định, closing có thể bắt đầu từ 4.800 từ. Model
được yêu cầu kết tự nhiên và giới hạn output token theo phần còn lại; server vẫn
kiểm tra số từ thật lúc commit, không cắt prose để ép vừa giới hạn.

Accept với `action=end_chapter` kết chương. Auto-advance cần đồng thời bật cấu
hình, draft ở mode `CLOSING` và số từ sau commit đạt target. API
`POST /api/chapters/:id/end` cũng kết chương riêng, nhưng từ chối nếu chương còn
job chờ/chạy/fallback. Chương kế tiếp được tạo hoặc dùng lại nếu chưa đóng.

Brief handoff mang tiến độ gần nhất, thay đổi nhân vật, facts và open threads
sang chương mới; ý định mới lấy từ hướng mở đầu người viết hoặc hướng tiếp theo.
Continue dùng Brief và Scene đã duyệt để nối truyện. Summarize là lệnh LLM riêng
ghi `chapter.summary`; kết chương không tự động gọi summarize.

Source: [`chapter-lifecycle.ts`](lib/chapters/chapter-lifecycle.ts),
[`chapter-service.ts`](lib/chapters/chapter-service.ts),
[`chapter-brief.ts`](lib/chapters/chapter-brief.ts).

<a id="core-data"></a>
### 9. Dữ liệu chính và đường đọc Reader

![Các quan hệ dữ liệu chính của Story và generation workflow](docs/diagrams/09-core-data.svg)

ERD rút gọn từ [`schema.prisma`](prisma/schema.prisma); chưa liệt kê toàn bộ bảng
và foreign key. Relationship/history, events, lore, secrets/knowledge, plot threads,
embeddings, retrieval logs và audit logs bổ sung canon hoặc khả năng truy vết.
Character Template nằm ngoài Story; `sourceTemplateId` chỉ là metadata nguồn gốc,
không phải quan hệ đồng bộ hồ sơ. Cardinality tùy chọn phản ánh foreign key
có thể null; ví dụ continuity issue không bắt buộc gắn GenerationRun.

Reader tại [`app/library/story/page.tsx`](app/library/story/page.tsx) gọi trực tiếp
`getLibraryStory` ở server, resolve slug hoặc legacy ID và redirect về URL chuẩn.
Nội dung chương ưu tiên manuscript ghép từ Scene theo thứ tự; code còn hỗ trợ
`chapter.content` cũ, sau đó fallback bản draft đã accept gần nhất hoặc summary
khi không có manuscript. Vì thế draft mới sinh nhưng chưa accept không tự xuất
hiện như nội dung chương.

<a id="operational-limits"></a>
### Giới hạn cần hiểu khi vận hành và sửa code

| Tình huống | Hành vi hiện tại và hệ quả |
| --- | --- |
| Bật embeddings | Adapter hiện ném lỗi; search fallback keyword. Không coi schema pgvector là bằng chứng semantic retrieval đã chạy được. |
| Worker chết sau khi claim | Queue bền vững và atomic claim không đồng nghĩa tự phục hồi job `RUNNING`. Worker hiện chỉ lấy `QUEUED`/`RETRYING`, chưa có lease/heartbeat hoặc stale-job recovery. |
| Review rồi sửa prose | Commit kiểm tra lại hard Harness trên nội dung được accept, nhưng continuity và extraction vẫn là kết quả lần generation trước. Sửa nội dung đáng kể cần kiểm tra lại và đối chiếu proposal để tránh duyệt dữ kiện cũ. |
| Quan sát chi phí | GenerationRun lưu model/prompt/output và usage của bước viết/repair; job có context snapshot, retrieval log và audit. Chưa phải tổng chi phí toàn bộ job vì evaluation/extraction có lời gọi riêng. |
| Lỗi hoặc quá tải provider | Có timeout/retry và job lưu tiến độ; chưa thấy rate limiter, global concurrency quota hay spend cap trong đường generation đã đọc. Không suy ra khả năng chịu tải production từ Docker local. |

Giữ kiến trúc hiện tại khi tiếp tục phát triển. Thứ tự cải thiện hợp lý là hoàn
thiện access/session và chính sách chi phí trước khi mở rộng người dùng; sau đó
thêm recovery cho job nếu worker chạy lâu dài; chỉ triển khai embedding provider
khi đo được keyword retrieval không đáp ứng nhu cầu. Tách queue/service riêng chỉ
khi lưu lượng hoặc vận hành cho thấy database queue là nút nghẽn.

### Duy trì hai phiên bản ngôn ngữ

Bản Anh: `README.md`. Bản Việt: `README.vi.md`.
Mermaid source/SVG tiếng Việt giữ tại [`docs/diagrams/`](docs/diagrams/);
bộ tiếng Anh nằm tại [`docs/diagrams/en/`](docs/diagrams/en/).
Hai bộ dùng **github-light**, **Arial**, cùng ID sơ đồ và anchor section ổn định.
README nhúng SVG nên không cần Markdown renderer hỗ trợ Mermaid.
[Mở phần kiến trúc tương ứng bằng tiếng Anh](README.md#architecture-guide).

Khi flow đổi, cập nhật cả hai README và hai source `.mmd`, render SVG bằng
Pretty Mermaid rồi kiểm tra link, nhãn, mũi tên, cardinality và bố cục.
Bước áp dụng canon thủ công mô tả việc cần làm, không khẳng định mọi loại canon
đã có editor riêng trong UI.

Prompt bảo trì theo Coding Prompt Builder:

```text
Purpose: Cập nhật tài liệu kiến trúc và flow từ code hiện tại.
Assumptions: Giữ logic ứng dụng; đồng bộ bản tiếng Anh và tiếng Việt.
Final Prompt:
Đọc AGENTS.md, hai README và source liên quan. Dùng GitNexus query/context để
xác định caller và execution flow; chạy impact trước khi sửa. Đối chiếu UI, API,
service, database, worker, prompt và model call. Cập nhật cả hai README và
Mermaid/SVG tương ứng. Phân biệt triển khai, fallback, giới hạn và đề xuất tương lai.
Giữ hướng dẫn setup đúng. Không thêm tính năng runtime, dependency hoặc refactor.
Kiểm tra chuyển ngôn ngữ, link/anchor local, render, nhãn, quan hệ và diff cuối.
Báo thay đổi, kết quả kiểm tra và phần chưa xác minh trực tiếp.
```
