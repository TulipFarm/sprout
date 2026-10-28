# Changelog

## [0.12.0](https://github.com/TulipFarm/sprout/compare/v0.11.1...v0.12.0) (2026-10-28)

### Features

* **a2ui:** add an A2UI catalog, surface renderer and Metric component ([#62](https://github.com/TulipFarm/sprout/issues/62)) ([3cad1d6](https://github.com/TulipFarm/sprout/commit/3cad1d65240885e8f47f024b3d08579e15cc4b91))

## [0.11.1](https://github.com/TulipFarm/sprout/compare/v0.11.0...v0.11.1) (2026-10-28)

### Features

* **plan-outline:** add accessible resource type icons ([#61](https://github.com/TulipFarm/sprout/issues/61)) ([ceed896](https://github.com/TulipFarm/sprout/commit/ceed896ecccbeceb9b69988168a0b14cf0970475))

## [0.11.0](https://github.com/TulipFarm/sprout/compare/v0.10.0...v0.11.0) (2026-10-27)

### Features

* **agent-fanout:** keep wide fan-outs as a tree by narrowing cards ([#56](https://github.com/TulipFarm/sprout/issues/56)) ([32f9f37](https://github.com/TulipFarm/sprout/commit/32f9f3796c60fe4539e4561493d67a394c9ab350))
* **knowledge-base:** add KnowledgeBase, a panel showing which sources feed a knowledge base ([#57](https://github.com/TulipFarm/sprout/issues/57)) ([ad9e16e](https://github.com/TulipFarm/sprout/commit/ad9e16e349bb4759527b8efcf53619bdce2f55a8))

## [0.10.0](https://github.com/TulipFarm/sprout/compare/v0.9.0...v0.10.0) (2026-10-25)

### Features

* **chat-window:** add ChatWindow, a floating chat shell with window, drawer, and full-page layouts ([#48](https://github.com/TulipFarm/sprout/issues/48)) ([99cb79b](https://github.com/TulipFarm/sprout/commit/99cb79b5cf20aafbdd292c451267b77621c0124a))

### Bug Fixes

* **theme:** keep tulipfarm input edges at 1.5:1 contrast ([#47](https://github.com/TulipFarm/sprout/issues/47)) ([c3ca329](https://github.com/TulipFarm/sprout/commit/c3ca3294b9c73ed62e2506bde1eda0977bd0e1ab))

## [0.9.0](https://github.com/TulipFarm/sprout/compare/v0.8.0...v0.9.0) (2026-10-24)

### Features

* **tool-activity:** status marks, icon row actions, and quieter web sources ([#46](https://github.com/TulipFarm/sprout/issues/46)) ([40a5a83](https://github.com/TulipFarm/sprout/commit/40a5a83e59ced6e1fb3e073d1c58cec195a7b412))
* **web-source:** add WebSource, a favicon and title chip for web pages ([#45](https://github.com/TulipFarm/sprout/issues/45)) ([6369076](https://github.com/TulipFarm/sprout/commit/636907658519a14e362e01a1306ba20c86300f31))

## [0.8.0](https://github.com/TulipFarm/sprout/compare/v0.7.0...v0.8.0) (2026-10-23)

### Features

* **theme:** give tulipfarm Linear-style depth ([#44](https://github.com/TulipFarm/sprout/issues/44)) ([4826a33](https://github.com/TulipFarm/sprout/commit/4826a337ee6d0f4572c819bf78c58e8d4d2328d0))

### Bug Fixes

* **command:** reorder items whose score is unchanged when search starts ([#43](https://github.com/TulipFarm/sprout/issues/43)) ([7a71e18](https://github.com/TulipFarm/sprout/commit/7a71e1807f0508c0b4c93a58ec4fda662c2ba981))

## [0.7.0](https://github.com/TulipFarm/sprout/compare/v0.6.0...v0.7.0) (2026-10-22)

### Features

* **model-selector:** searchable ModelSelector with speed, quality, and cost meters ([#37](https://github.com/TulipFarm/sprout/issues/37)) ([a6524a5](https://github.com/TulipFarm/sprout/commit/a6524a54f04327c33c6ee036c48ce88ef4f5c310)), references [#38](https://github.com/TulipFarm/sprout/issues/38)
* **rich-text-editor:** integration keyword chips with icons, account tooltips, and a switch menu ([#42](https://github.com/TulipFarm/sprout/issues/42)) ([5dbd29c](https://github.com/TulipFarm/sprout/commit/5dbd29c728b3afded6b18ba32b3091300a2c7746))
* **status:** add Status, a small round mark for task and step states ([#39](https://github.com/TulipFarm/sprout/issues/39)) ([8e07993](https://github.com/TulipFarm/sprout/commit/8e0799304ca0d124b4cf272db054be24b8ac83a1))
* **task-tree:** add Task Tree, a live tree of tasks with a Status on each ([#41](https://github.com/TulipFarm/sprout/issues/41)) ([1f07861](https://github.com/TulipFarm/sprout/commit/1f07861855126522adaaeae0f8cd16b81636b899))

## [0.6.0](https://github.com/TulipFarm/sprout/compare/v0.5.0...v0.6.0) (2026-10-22)

### ⚠ BREAKING CHANGES

* **agent-fanout:** AgentFanout takes one root `agent` with nested `agents`
  instead of `task`, `agents`, `state`, `elapsed`, and `onStop`. Agent
  `status` is queued, running, needs-you, done, failed, or stopped
  (`working` is now `running`). `color`, `result`, `duration`, `label`,
  and `defaultOpen` are removed. The component no longer uses React Flow.

### Features

* **agent-fanout:** rebuild AgentFanout as an animated tree of agent cards ([204aff6](https://github.com/TulipFarm/sprout/commit/204aff6895dbf45344061701d743340891573104))
* TulipFarm theme source of truth, OKLCH colours and component polish ([#38](https://github.com/TulipFarm/sprout/issues/38)) ([e1894eb](https://github.com/TulipFarm/sprout/commit/e1894eb5d788857ad977f05e550c428722b61506))

## [0.5.0](https://github.com/TulipFarm/sprout/compare/v0.4.0...v0.5.0) (2026-10-21)

### ⚠ BREAKING CHANGES

* **agent-avatar:** AgentAvatar and agentAvatarSrc moved from
  @tulipfarm/sprout/avatar to @tulipfarm/sprout/agent-avatar.
  agentAvatarSrc no longer takes a baseUrl and returns a data URI. New
* size names are now sm / md / lg.
  - default -> md and compact -> sm on every sized component.
  - Button: xs and the special sizes are removed. Icon sizes stay.
  - Attachment: default/sm/xs -> lg/md/sm.
  - Avatar, EntityAvatar, AgentAvatar: xs and xl are removed.
  - GradientBanner: xl is removed. ScrollArea: auto is removed; leave size
    unset to follow content.
  - StateSample columns: wide/narrow -> lg/sm.
  - Select: the calendar size is removed.

### Features

* **agent-avatar:** bundle agent avatar artwork into sprout ([c7a2955](https://github.com/TulipFarm/sprout/commit/c7a2955eff265e971e0f1752175ce8ec7f815544))
* share control height, add ghost-destructive, unify sizes to sm/md/lg ([76f3664](https://github.com/TulipFarm/sprout/commit/76f36648c69bcee56f8fbf209e82bbe9d9135a1b))

## [0.4.0](https://github.com/TulipFarm/sprout/compare/v0.3.1...v0.4.0) (2026-10-21)

### Features

* **board:** add Board (Kanban) component ([#26](https://github.com/TulipFarm/sprout/issues/26)) ([f30114c](https://github.com/TulipFarm/sprout/commit/f30114cae466b698a02f2162916d433b2a9d36d9))
* **board:** add per-column states, Show all and read-only fixes ([54f616d](https://github.com/TulipFarm/sprout/commit/54f616da7a6df13f51e5f23bdf5b0fe014d51ba5))
* **chart:** add business charts ([#27](https://github.com/TulipFarm/sprout/issues/27)) ([a198de3](https://github.com/TulipFarm/sprout/commit/a198de3364f63339e87730c75d43d1f7c8a04aa4))
* **record-list:** add RecordList for the List view ([1723745](https://github.com/TulipFarm/sprout/commit/1723745b0fd3e4e164e2718701e14c809ba3d790))
* **result-notice:** add ResultNotice for capped result sets ([73ea90f](https://github.com/TulipFarm/sprout/commit/73ea90f3a1011ebad48a9d7fa79cc35cd2ec69c0))
* **theme:** add a vibrant ten-hue palette for charts and agent colors ([#25](https://github.com/TulipFarm/sprout/issues/25)) ([e096670](https://github.com/TulipFarm/sprout/commit/e09667030eb2baa15f95fdb9165985c8e870115f))
* **timeline:** add windowed record timeline entry ([78b7a72](https://github.com/TulipFarm/sprout/commit/78b7a72041c00dba43fc2e242cd226c901f0e5d8))
* **view-switcher:** add ViewSwitcher for a table's open views ([feafb8b](https://github.com/TulipFarm/sprout/commit/feafb8bdfee914f56942f4eacd7e3b5811440680))

## [0.3.1](https://github.com/TulipFarm/sprout/compare/v0.2.0...v0.3.1) (2026-10-19)

### Features

* **agent-fanout:** add AgentFanout for a parent agent calling subagents ([9bd0cb6](https://github.com/TulipFarm/sprout/commit/9bd0cb619f2b78670b9d2a70039a6a75c91372eb))
* **chat-confirmation:** add approveLabel for the approve button ([#23](https://github.com/TulipFarm/sprout/issues/23)) ([4d9a2e6](https://github.com/TulipFarm/sprout/commit/4d9a2e6e243bcbbdea262c91b6a3e43303b5884f))
* **presence-cursor:** add PresenceCursor with name tag or avatar ([d265c1f](https://github.com/TulipFarm/sprout/commit/d265c1f03bdc4055fc9ac9525edc7b982682a2f4))
* **result-card:** let apps without a brand pass an icon ([#24](https://github.com/TulipFarm/sprout/issues/24)) ([32fef6e](https://github.com/TulipFarm/sprout/commit/32fef6e60759aca91777718a84c3aa6fb9736a20))
* **sql-viewer:** add SqlViewer for TulipFarm tables and joins ([9182720](https://github.com/TulipFarm/sprout/commit/9182720f9fa05c8393172cc8943209a396c9040d))

### Bug Fixes

* **brand-icon:** keep stacked tiles as tooltip triggers ([ee8bcc7](https://github.com/TulipFarm/sprout/commit/ee8bcc78aaf8fe75b0691b5f083dadfd6423d41e))
* **brand-icon:** keep the brand-tile slot on stacked tiles ([f4c82db](https://github.com/TulipFarm/sprout/commit/f4c82db4891b89df9b3f36c73577c59acbf1d548))
* **chat-sources:** keep a pressed citation open past a stale hover close ([b945aad](https://github.com/TulipFarm/sprout/commit/b945aad66be49b73b43392d8bcbc79466e52b45f))
* **docs:** name the search button when its label is hidden ([0fbed34](https://github.com/TulipFarm/sprout/commit/0fbed346bed4da70d75971531d1edda2840fe050))
* **message:** show the danger focus ring on destructive bubbles ([c446909](https://github.com/TulipFarm/sprout/commit/c4469097e712bd0fc3ec085a24f4375bb7c953dc))
* **release:** format CHANGELOG with Prettier during release ([b8742e5](https://github.com/TulipFarm/sprout/commit/b8742e504c811c23a5cf1140801b1382ef1045e6))
* **size:** measure relative to the package so chunk hashes match across checkouts ([5762c3b](https://github.com/TulipFarm/sprout/commit/5762c3bcb1ef69fa678e42c6e342a7a4f2ea47a7))
* **themes:** lift TulipFarm primary subtle to pass AA contrast ([49cf18a](https://github.com/TulipFarm/sprout/commit/49cf18a1b80f4775e72b3406191879e99a83ded8))

## [0.3.0](https://github.com/TulipFarm/sprout/compare/v0.2.0...v0.3.0) (2026-10-19)

### Features

* **agent-fanout:** add AgentFanout for a parent agent calling subagents ([9bd0cb6](https://github.com/TulipFarm/sprout/commit/9bd0cb619f2b78670b9d2a70039a6a75c91372eb))
* **presence-cursor:** add PresenceCursor with name tag or avatar ([d265c1f](https://github.com/TulipFarm/sprout/commit/d265c1f03bdc4055fc9ac9525edc7b982682a2f4))
* **sql-viewer:** add SqlViewer for TulipFarm tables and joins ([9182720](https://github.com/TulipFarm/sprout/commit/9182720f9fa05c8393172cc8943209a396c9040d))

### Bug Fixes

* **brand-icon:** keep stacked tiles as tooltip triggers ([ee8bcc7](https://github.com/TulipFarm/sprout/commit/ee8bcc78aaf8fe75b0691b5f083dadfd6423d41e))
* **brand-icon:** keep the brand-tile slot on stacked tiles ([f4c82db](https://github.com/TulipFarm/sprout/commit/f4c82db4891b89df9b3f36c73577c59acbf1d548))
* **chat-sources:** keep a pressed citation open past a stale hover close ([b945aad](https://github.com/TulipFarm/sprout/commit/b945aad66be49b73b43392d8bcbc79466e52b45f))
* **docs:** name the search button when its label is hidden ([0fbed34](https://github.com/TulipFarm/sprout/commit/0fbed346bed4da70d75971531d1edda2840fe050))
* **message:** show the danger focus ring on destructive bubbles ([c446909](https://github.com/TulipFarm/sprout/commit/c4469097e712bd0fc3ec085a24f4375bb7c953dc))
* **release:** format CHANGELOG with Prettier during release ([b8742e5](https://github.com/TulipFarm/sprout/commit/b8742e504c811c23a5cf1140801b1382ef1045e6))
* **size:** measure relative to the package so chunk hashes match across checkouts ([5762c3b](https://github.com/TulipFarm/sprout/commit/5762c3bcb1ef69fa678e42c6e342a7a4f2ea47a7))
* **themes:** lift TulipFarm primary subtle to pass AA contrast ([49cf18a](https://github.com/TulipFarm/sprout/commit/49cf18a1b80f4775e72b3406191879e99a83ded8))

## [0.2.0](https://github.com/TulipFarm/sprout/compare/v0.1.0...v0.2.0) (2026-10-19)

### Features

- **chat-input:** add ChatInput and reuse library parts across components ([03e2a58](https://github.com/TulipFarm/sprout/commit/03e2a585313f1674a81025b20849f450e58d8e6a)), references [#files](https://github.com/TulipFarm/sprout/issues/files)
- **file-explorer:** add read-only File Explorer with tree, tabs, syntax colors, and search ([e248d75](https://github.com/TulipFarm/sprout/commit/e248d75b966ecb824adbbc253ae59cd3f566c88d))
- **file-viewer:** redesign the full-screen header and add actions, menu, and panel slots ([22d9591](https://github.com/TulipFarm/sprout/commit/22d95913cab194c7586cc607ea32df948e40a24e))

### Bug Fixes

- **themes:** match TulipFarm theme to TulipFarm Cloud ([253ccea](https://github.com/TulipFarm/sprout/commit/253ccea48827e50caee69c361a84a749469ec852)), references [#75ce8e](https://github.com/TulipFarm/sprout/issues/75ce8e)

## 0.1.0 (2026-10-18)

### Bug Fixes

- **release:** drop postpack README removal that breaks pnpm pack ([91c38d7](https://github.com/TulipFarm/sprout/commit/91c38d79e7810298a824d7b4ac62c57526ff63b7))
