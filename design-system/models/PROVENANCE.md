# Where the model photographs come from

App Review can ask who owns the imagery (guideline 5.2). The review notes say only
that the catalogue photographs are "generated", because ownership cannot yet be shown.
This is the record behind that. It states what the files themselves show, and marks
what nothing in the repo can show.

## What the files say

Read from the embedded C2PA / PNG metadata of the base photographs in this folder
(checked on `white-25-34.png` and `black-35-44.png`, 2026-09-21):

- **AI-generated.** The IPTC digital source type is `trainedAlgorithmicMedia`.
- **Model:** `seedream-5-0`, served through **BytePlus ModelArk**.
- **Route:** a `hf-job-id` text chunk, which is a Higgsfield job — so the images were
  produced through Higgsfield and exported.
- **Created:** 2026-08-28.
- **No real person.** They are generated faces, not photographs of anybody. The age
  band in a filename is an unreliable label, not a fact about the picture; see
  `models/README.md` and the three `13-17` files withdrawn from the manifest.

## What is not recorded anywhere in the repo

- **The commercial-use terms** of the Higgsfield plan and of BytePlus ModelArk that were in
  force on 2026-08-28. "Owned by us" is only true to the extent those terms grant it.
  *Confirm, and put the plan name and the date of the terms here.*
- **Where the onboarding footage came from.** The 21 files in
  `apps/mobile/assets/onboarding/` (twelve wall stills and the carousel clips) carry no
  metadata at all, and `tools/onboarding-footage/` holds only the upload script. *Record
  the tool, the plan and whether any real person appears.*

Until those two are filled in, do not claim ownership in the review notes or the store
listing. "Generated" is what the files show; "owned" needs the terms above.
