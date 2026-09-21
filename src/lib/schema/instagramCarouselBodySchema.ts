import { z } from 'zod';

const instagramCarouselBodySchema = z.object({
  url: z.string(),
});

export default instagramCarouselBodySchema;
