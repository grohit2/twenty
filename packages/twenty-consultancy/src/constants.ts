// HRMS Hub -- Centralized UUID Registry
// Every universalIdentifier used in the app is defined here.
// NEVER duplicate UUIDs. NEVER inline UUIDs in entity files.

// Person standard object UUID (from Twenty platform)
export const PERSON_OBJECT_ID = '20202020-e674-48e5-a542-72570eee7213';

// Person standard field UUIDs (from Twenty platform)
export const PERSON_FIELD_IDS = {
  name: '20202020-3875-44d5-8c33-a6239011cab8',
  emails: '20202020-3c51-43fa-8b6e-af39e29368ab',
  phones: '20202020-0638-448e-8825-439134618022',
  jobTitle: '20202020-b0d0-415a-bef9-640a26dacd9b',
  city: '20202020-5243-4ffb-afc5-2c675da41346',
  company: '20202020-e2f3-448e-b34c-2d625f0025fd',
  createdAt: '20202020-e01b-4142-9b42-56789abcdefa',
  createdBy: '20202020-f6ab-4d98-af24-a3d5b664148a',
} as const;

// Application
export const UUIDS = {
  app: 'e1e703e5-b17a-46f3-b3f5-e4b49dd10d52',
  defaultRole: '28533964-5d96-4d63-a509-caa33c602a58',
  preInstallFn: '450266d4-aac7-4088-a155-6d901ba75886',
  postInstallFn: 'f8229b1d-3b6d-425b-8955-92fad1c131ef',

  // Custom fields on Person (9 fields)
  fields: {
    employmentType: '1e630718-6476-43d9-b891-441d29e6efa1',
    employmentStatus: 'a3408b82-b9e5-4742-b647-77a45cfdf60d',
    visaType: 'dbea77df-b3be-43e1-849d-8e979c24975f',
    payRate: '996ff531-b3bb-4fd2-a0c4-501c5c60701a',
    billRate: '3b22b3ff-a53b-44dd-996b-1c12a6477ef2',
    startDate: '664d1706-da71-4138-90a0-9bd60bc7c626',
    placedAt: 'db4a3289-1023-4cf1-abb0-61e78882b9c8',
    recruiter: '23953462-cced-4a35-ae43-74fbeb8b2455',
    benchSince: '7066f581-3b2f-4fa5-bd7d-1ae769574e84',
  },

  // SELECT option IDs
  options: {
    employmentType: {
      w2: 'fc332fa3-5546-46b1-84c3-d578ba464e02',
      _1099: 'aa8f3f0b-9537-4ca4-a66a-1a5d5bbbefa0',
      c2c: 'edef23fd-35a7-46fe-8252-c70f656aaf88',
    },
    employmentStatus: {
      active: '6d3ef827-fc9f-4655-85b6-6e4832921bec',
      onBench: 'e21ed447-c00d-462e-8572-6aa159601354',
      onLeave: 'f359fca7-ddc7-4939-92c2-85d41c2e73dd',
      onboarding: '1a42e2a1-e074-4859-8ac6-e999f0fffee8',
      terminated: '6db20d2b-e10a-4a13-92a6-a5c76622e7cf',
    },
    visaType: {
      h1b: '701f456a-e2bd-4c3d-9d50-446761efb239',
      h4Ead: 'd67ade79-dda5-4b49-a08b-d36dce9fb61b',
      l1a: '22567177-f91a-446b-ae84-3d4605a2c5a9',
      l1b: '5350b57a-9585-4195-a37b-7d37ae9fa7d5',
      f1Opt: '95d29cb3-0405-4c24-9f55-582dd8fce02c',
      stemOpt: '67696cce-73c9-4153-b925-df581a8abc03',
      tn: '59870ed1-5bab-4f0c-8374-649e070fd9b9',
      o1: 'f10e3e67-3805-4a14-8df6-5c9f95be6fed',
      greenCard: '994f9a19-fbe4-421b-b028-210d402edc96',
      usCitizen: 'c6f6e39b-9da3-4280-a25f-51ebaf48f82e',
      ead: 'e5c30a6f-cff3-4bf4-a37d-4a8e7ad89bbc',
    },
  },

  // Views (6)
  views: {
    allPeople: 'cb5cb3a8-0426-4892-a7d8-9b92c3dcbfb2',
    activeConsultants: '23ac976d-1fd1-4726-a7dd-dfa07b30231e',
    w2Employees: 'eb8e99de-e30a-4970-94a0-72ba9cb4e440',
    contractors1099C2c: '3202c186-2ec0-4e84-a29e-c80744d09bdb',
    onBench: '1acbfe34-f17a-4249-85ed-5ad2e2755e79',
    recentlyJoined: '2333c031-b4c5-41ca-94bf-0f8468409c4e',
  },

  // Navigation menu items (6)
  nav: {
    allPeople: '0ab22bc2-358b-4ade-a8af-e2633fc90670',
    activeConsultants: '3cf28fa0-1c64-496e-8fae-cf05673e9c3d',
    w2Employees: '10e45dd6-dc1e-4ec3-85a8-648639103fd4',
    contractors1099C2c: '2ebae43b-cd7f-4d58-b4c6-5191243ce759',
    onBench: '7b69f71f-f9bf-4991-84a1-7c4bebe407a3',
    recentlyJoined: 'a06be093-ade3-4f38-af61-d6b4f0246aac',
  },

  // View filters
  filters: {
    activeStatus: 'cc98b4a7-753a-4403-9ec0-592ffbf02d7c',
    w2Type: '0f02fb7f-1b7d-4225-bebd-81238ddf2fb4',
    _1099Type: 'c325559c-b8a0-48ef-a426-c14f51688062',
    c2cType: 'a33db46f-d14c-4b1c-bdcf-e7615e658f53',
    onBenchStatus: 'e231c641-b956-44e8-bb16-9a169a1ef3aa',
    recentlyJoined: 'bcaef9a3-8bd1-4d2b-a12e-d59db31d86a9',
  },

  // Filter groups
  filterGroups: {
    contractors1099C2c: '7823339a-e4c9-415b-a6a1-56134b9a0db9',
  },

  // ============================
  // Phase 2: Contract Tracking
  // ============================

  // Contract custom object
  contract: {
    object: '366c353d-92c9-4136-8198-db80ddad5abf',

    // Core fields (CONTRACT-01)
    status: '5fb27507-bb61-44cb-a3c1-01f99d9f5e84',
    contractType: 'c1467a9f-2a01-4b25-9c01-4ef52575b11b',
    startDate: '7f234b02-fb15-473e-8b12-344366eacf96',
    endDate: '5a028154-6d79-4d87-b02e-e9b1735ca521',
    value: 'a83c2bfa-48f3-4c99-a94c-abae107367cd',
    renewalDate: 'b694ddb2-233b-4a8f-ab76-f048b5c3a9e5',
    autoRenew: 'ddd7647f-0ace-4ed3-b998-b7bc575c8297',
    probationEndDate: '910cd9b0-50ea-474c-a9c0-9b6f2456be2c',
    noticePeriod: 'f3067a6e-98c7-4c59-9eb6-5ec57805027f',
    contractNumber: 'd64de867-7238-4922-b073-c2fecc299a9e',
    department: 'eea7376e-8378-4414-b1b8-26c636034bd2',
    notes: '7f9e73e8-e208-4d01-9efe-e9b4cee71c77',
    documentLinks: 'e693ade9-249b-475d-b2ca-b76d97ec2c96',

    // Client fields (CONTRACT-02)
    clientName: '8a2e9635-b674-4a8b-a3c2-43182b588a07',
    clientContactName: '7f432898-e297-471a-a0c9-f5a3c604d38b',
    clientContactEmail: '6d23b3d2-ba0c-4be8-9289-5369f58e6087',
    clientContactPhone: '64ed10ef-2a6f-41b4-9bf1-0291d16bbef8',
    clientWorksite: 'a8632d17-8f16-4f71-bfcc-ca92aa742291',
    clientIndustry: 'd7f6231c-d0f4-453a-a806-9c4689dbe3bd',
    msaStatus: '165a5cfd-94a3-4770-9e23-7032880bc300',
    clientManagerName: '2da9a435-2a44-4654-891b-8d7e071c1955',
    billRate: 'c8815304-0321-4c3c-9bda-bb1f28269eae',

    // Vendor fields (CONTRACT-03)
    vendorName: '78a6f893-71fb-4676-9860-9fd32adcb8df',
    vendorContactName: 'e1397628-5e43-4cab-a119-893b8c42235e',
    vendorContactEmail: '23747e82-7b0e-4946-a45a-0af823d87712',
    vendorPaymentTerms: '571ebce6-0d71-4d8c-b4bb-f47705c942fa',
    vendorMargin: '998871d2-7102-4fc6-97a9-888e23cb654d',
    vendorContractStatus: '08ca722e-52ee-46cd-8d4d-7081bf898747',

    // Placement fields (CONTRACT-04)
    placementChain: 'ad6a8539-ec8e-4a59-847e-02412e787c45',
    placementStartDate: '24a5df62-6a23-482b-a02f-9f47430f175f',
    placementEndDate: '2b714b35-241e-41ac-a51d-3f58979b7fb4',

    // Profitability fields (CONTRACT-05)
    consultantPayRate: 'eea683bc-795f-4aa6-8012-e4d906a160c6',
    yourMargin: '64191935-0078-4ab6-90a1-b80defe4a3c3',
    rateType: '0f6534e9-4bf8-4aac-a9a4-2265968c9a4a',

    // Relation fields (CONTRACT-06)
    personRelation: '2dae6b78-0f2f-443c-a11a-38c74de4f0e5',
    contractsOnPerson: '4a815893-a5e0-44fa-9bb6-661ad7e913f7',

    // SELECT option IDs
    options: {
      status: {
        draft: '091228b4-c7d8-49ec-be8e-4daf11554559',
        active: '34f5479c-2c0d-477a-b072-6a4a897dc763',
        expired: 'fa66935c-e19f-4eda-a749-b61487ce5b75',
        terminated: '3beaac87-8cac-4e17-84ea-f28821e285b8',
        renewed: '47041c8c-e64e-47d1-b64d-2d319e190a63',
        onHold: 'cc8d72d3-e6a4-4d96-b092-7d970aaf08e6',
      },
      contractType: {
        w2: '169f09b4-1b93-4c25-8124-38389f4d657a',
        c2c: 'b4a9644d-3590-41ed-bc6c-be450ce06da9',
        _1099: '98dcd5e5-001c-41cd-afd9-01a2157aaefc',
        subcontract: '669a9a2a-e6c7-4c9c-b365-2c6b32a1bae6',
        directHire: '7461ed76-70e0-463a-9850-7946edc6219a',
      },
      rateType: {
        hourly: 'f793a41f-590d-435c-b7d9-8da6f523685c',
        annual: 'c81b466f-276b-45dd-b9a3-93f8688168c1',
        fixed: '3ebefabb-ff31-4171-a670-aee7516c2271',
      },
      msaStatus: {
        active: 'be73d244-f103-4d72-8909-12e1dd291ad5',
        pending: '23d3645f-40d5-4f9e-bc51-f10005acdcd5',
        expired: 'beec45b9-2785-4587-8779-3b458aafc596',
        notApplicable: '543ddc0d-cca9-42d4-b50b-8221093225a1',
      },
      vendorContractStatus: {
        active: '883e1c8b-fa05-4835-ba7b-9ff97aaa00cb',
        pending: 'd51e2c43-4d36-458c-9a0f-8b2d81ece98a',
        expired: '86d2a045-9ac0-460d-80dc-b10d1f2023fc',
        terminated: '09487741-e715-474d-9edf-7aca60480eea',
      },
    },
  },

  // View fields (columns shown in each view)
  viewFields: {
    allPeople: {
      name: 'f0a2a66a-1c6f-48fa-be93-f287aaf4cbe2',
      emails: '6a1a5b97-35e2-4ba7-b3c8-1046ef373d9a',
      employmentType: '79390331-101d-4114-92fb-3612e9a93f1f',
      employmentStatus: '2343ad1c-6bb0-4e96-9402-2aa0a5e01840',
      visaType: '772a18a4-f7fc-4ec7-9c53-0c2f5377b8dc',
      placedAt: '201f7436-86a9-4be7-915e-43c0354ab5cc',
      payRate: 'a48f8b16-9b44-41db-b900-ce5842b673f8',
      billRate: '6acc000f-580e-4e7a-b8ed-19a0ceb65401',
      phones: '347f07c9-d690-4115-b388-c7c06c68e9f3',
      city: 'c3aa7b0d-a686-4106-9793-d3cfc9127046',
    },
    activeConsultants: {
      name: '9d3794d1-8964-48fa-877f-16e0478757a4',
      placedAt: '453e2eea-ad90-46b7-b48d-885413d02449',
      billRate: '4eeef943-8635-47c7-a62f-834fdc499139',
      payRate: 'c0599bfb-da17-489a-80e5-557c4eb76d11',
      visaType: '5dc886de-209e-4e1b-8a7d-275de7819202',
      employmentType: '383fef6e-5701-4061-a4d5-9d307574d6ef',
      startDate: 'af81aaca-72cc-46db-80db-1aa757870420',
      phones: '14539b11-9a44-441b-bed3-57047ef02b15',
    },
    w2Employees: {
      name: '2a3f3377-4d28-416c-8014-ae5fe640c272',
      employmentStatus: '927e6895-3eab-4e56-a96a-c15a74a9d0d1',
      visaType: 'ab3c9443-36c9-4490-897e-461079ed4c8f',
      payRate: 'd661b580-5099-4b0b-9f13-e2d329740758',
      placedAt: 'd6def26a-e276-4f69-930f-2304f4c2b9f4',
      startDate: '65d06b06-baee-491f-822e-ead7db7544b3',
      phones: 'df5c2284-25e4-4e2b-9019-a86cbfc0111c',
    },
    contractors1099C2c: {
      name: '46af4067-280a-4ac5-b469-db601fd1ac4a',
      employmentType: '1df51212-b7b9-4ccf-a56f-f048e10182c3',
      billRate: 'b57c410c-be41-4376-b519-f7e4233d7ebf',
      payRate: '2d4106ee-a317-40e8-87d1-2d1a83e6ef18',
      placedAt: '0f9e7c82-1bf2-48f8-a574-c38caf266d43',
      visaType: '1b54369c-1883-4be0-8fba-ed4108d75f46',
      phones: '3fcc3ac9-3ba7-4b12-ac62-cac7cc41705d',
    },
    onBench: {
      name: 'b079ba7a-0f24-4013-8ca5-7f1fbf1c280a',
      benchSince: 'c7479d94-6ce7-4516-9bf1-94b9b71fe2ce',
      visaType: 'dd117a58-8d37-4882-8158-424a3f576dc6',
      employmentType: '5cff9785-a677-402c-b3ef-1c6ba48933e2',
      recruiter: '822398fd-01d5-4913-9a94-8a4a0c2b53f3',
      payRate: '14f36140-6517-4e2d-a936-9c1a67cb2b1c',
      phones: 'ac056726-7e20-4421-b2f0-ca02efac7e21',
    },
    recentlyJoined: {
      name: 'bd40d61f-6cc6-43d3-a86a-3f72e3ce9b4d',
      startDate: '999d49de-04e5-4ec7-b5cc-d233867be444',
      employmentType: '693a3fcc-8207-4d4e-ac28-cffddd735913',
      employmentStatus: '5a6d2e50-8604-4613-a369-3edcc287c33a',
      visaType: 'bfc309d3-5456-4e92-afd6-80110ae38247',
      placedAt: '1a3b1c32-daa9-4808-919a-328763d09beb',
      recruiter: 'bd3a47af-e114-4679-bbf4-79b0adff16a0',
    },
  },
} as const;
