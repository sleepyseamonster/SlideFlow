interface InstagramPostParams {
  accessToken: string;
  instagramBusinessAccountId: string;
  imageUrls: string[];
  caption?: string;
}

export async function postCarouselToInstagram({
  accessToken,
  instagramBusinessAccountId,
  imageUrls,
  caption = ''
}: InstagramPostParams): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const mediaIds: string[] = [];

    for (const imageUrl of imageUrls) {
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramBusinessAccountId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: imageUrl,
            is_carousel_item: true,
            access_token: accessToken,
          }),
        }
      );

      const containerData = await containerResponse.json();

      if (!containerResponse.ok || containerData.error) {
        throw new Error(containerData.error?.message || 'Failed to create media container');
      }

      mediaIds.push(containerData.id);
    }

    const carouselResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramBusinessAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: mediaIds,
          caption: caption,
          access_token: accessToken,
        }),
      }
    );

    const carouselData = await carouselResponse.json();

    if (!carouselResponse.ok || carouselData.error) {
      throw new Error(carouselData.error?.message || 'Failed to create carousel container');
    }

    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${instagramBusinessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: carouselData.id,
          access_token: accessToken,
        }),
      }
    );

    const publishData = await publishResponse.json();

    if (!publishResponse.ok || publishData.error) {
      throw new Error(publishData.error?.message || 'Failed to publish carousel');
    }

    return {
      success: true,
      postId: publishData.id,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to post to Instagram';
    console.error('Instagram posting error:', error);
    return {
      success: false,
      error: message,
    };
  }
}

export async function getInstagramBusinessAccounts(
  accessToken: string,
  userId: string
): Promise<{ id: string; username: string }[]> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}/accounts?access_token=${accessToken}`
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Failed to fetch Facebook pages');
    }

    const accounts = [];

    for (const page of data.data || []) {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
      );

      const igData = await igResponse.json();

      if (igData.instagram_business_account) {
        const igAccountResponse = await fetch(
          `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=username&access_token=${accessToken}`
        );

        const igAccountData = await igAccountResponse.json();

        accounts.push({
          id: igData.instagram_business_account.id,
          username: igAccountData.username,
        });
      }
    }

    return accounts;
  } catch (error: unknown) {
    console.error('Failed to fetch Instagram accounts:', error);
    return [];
  }
}
