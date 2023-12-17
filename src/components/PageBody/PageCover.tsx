import { RevisionPageDocument, RevisionPageDocumentCover } from '@gitbook/api';

import { Image } from '@/components/utils';
import { ContentRefContext, resolveContentRef } from '@/lib/references';
import { tcls } from '@/lib/tailwind';

import defaultPageCover from './default-page-cover.svg';
import { PAGE_COVER_HEIGHT } from '../layout';

/**
 * Cover for the page.
 */
export async function PageCover(props: {
    as: 'hero' | 'full';
    page: RevisionPageDocument;
    cover: RevisionPageDocumentCover;
    context: ContentRefContext;
}) {
    const { as, cover, context } = props;
    const resolved = cover.ref ? await resolveContentRef(cover.ref, context) : null;

    return (
        <div
            className={tcls(
                PAGE_COVER_HEIGHT,
                'overflow-hidden',
                // Negative margin to balance the container padding
                as === 'full'
                    ? ['-mx-4', 'sm:-mx-6', 'md:-mx-8']
                    : ['max-w-3xl', 'mx-auto', 'rounded-md', 'mb-8'],
            )}
        >
            <Image
                alt="Page cover image"
                sources={{
                    light: {
                        src: resolved?.href ?? defaultPageCover.src,
                        size: resolved
                            ? resolved?.fileDimensions
                            : { width: defaultPageCover.width, height: defaultPageCover.height },
                    },
                }}
                resize={
                    // When using the default cover, we don't want to resize as it's a SVG
                    !!resolved
                }
                sizes={[
                    // Cover takes the full width on mobile/table
                    {
                        media: '(max-width: 768px)',
                        width: 768,
                    },
                    {
                        media: '(max-width: 1024px)',
                        width: 1024,
                    },
                    // Maximum size of the cover
                    { width: 1248 },
                ]}
                className={tcls('w-full', 'h-full', 'object-cover', 'object-center')}
            />
        </div>
    );
}
