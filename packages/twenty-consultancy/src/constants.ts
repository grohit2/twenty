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
