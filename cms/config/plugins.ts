export default {
  upload: {
    config: {
      providerOptions: {
        localServer: {
          // Strapi gives each uploaded file a content-hashed URL. A replacement
          // gets a new URL, so browsers can safely retain the old file.
          maxage: 365 * 24 * 60 * 60 * 1000,
        },
      },
    },
  },
  'users-permissions': {
    enabled: true,
  },
};
