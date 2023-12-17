/* eslint-disable @next/next/no-img-element */
import ReactDOM from 'react-dom';

import { getImageSize, getResizedImageURL, isImageResizingEnabled } from '@/lib/images';
import { ClassValue, tcls } from '@/lib/tailwind';

import { PolymorphicComponentProp } from './types';

type ImageSize = { width: number; height: number } | { aspectRatio: number };

type ImageSource = {
    src: string;
    size?: ImageSize;
};

type ImageResponsiveSize = {
    /** Media query to apply this width for */
    media?: string;

    /** Width of the image for this media */
    width: number;
};

const MAX_DPR = 4;

interface ImageCommonProps {
    /**
     * Response sizes.
     */
    sizes?: ImageResponsiveSize[];

    /**
     * The `alt` attribute is required for accessibility.
     */
    alt: string;

    /**
     * Quality of the optimized image.
     * @default 100
     */
    quality?: number;

    /**
     * Whether to resize the image.
     */
    resize?: boolean;

    /**
     * Priority of the image.
     * - `lazy` will load the image only when it's visible in the viewport.
     * - `eager` will load the image as soon as possible, even if it's not visible; but will not preload.
     * - `high` will preload.
     *
     * @default normal
     */
    priority?: 'lazy' | 'normal' | 'high';

    /**
     * Force preloading the image.
     * Even if the priority is set to `lazy`, the image will be preloaded.
     *
     * Useful for images that are not visible in the viewport, but that we want to preload.
     */
    preload?: boolean;

    /**
     * The `style` attribute is used to apply custom styles.
     */
    style?: ClassValue;
}

/**
 * Render an image that will be swapped depending on the theme.
 * We don't use the `next/image` component because we need to load images from external sources,
 * and we want to avoid client components.
 */
export async function Image(
    props: PolymorphicComponentProp<
        'img',
        {
            /**
             * Sources for the image.
             */
            sources: {
                light: ImageSource;
                dark?: ImageSource | null;
            };
        } & ImageCommonProps
    >,
) {
    const { sources, style, ...rest } = props;

    return (
        <>
            <ImagePicture
                {...rest}
                source={sources.light}
                className={tcls(rest.className, sources.dark ? 'dark:hidden' : null, style)}
            />
            {sources.dark ? (
                <ImagePicture
                    source={sources.dark}
                    {...rest}
                    // We don't want to preload the dark image, because it's not visible
                    // TODO: adapt based on the default theme
                    priority="lazy"
                    className={tcls(rest.className, 'hidden', 'dark:block', style)}
                />
            ) : null}
        </>
    );
}

async function ImagePicture(
    props: PolymorphicComponentProp<
        'img',
        {
            source: ImageSource;
        } & ImageCommonProps
    >,
) {
    const {
        source,
        sizes = [],
        style,
        alt,
        quality = 100,
        priority = 'normal',
        resize = true,
        preload = false,
        ...rest
    } = props;

    let srcSet: undefined | string;
    let sizesAttr: undefined | string;
    let src = source.src;

    // Responsive sizes
    if (resize && isImageResizingEnabled()) {
        const getURL = await getResizedImageURL(source.src);

        const srcSetAlts: string[] = [];
        const sizeAlts: string[] = [];
        let defaultSize: ImageResponsiveSize | undefined;

        sizes.map(async (size, index) => {
            for (let dpr = 1; dpr <= MAX_DPR; dpr++) {
                const resizedURL = getURL({
                    width: size.width,
                    quality,
                    dpr,
                });

                if (!size.media) {
                    // Use the resize URL as the default source.
                    src = resizedURL;
                    defaultSize = size;
                }

                srcSetAlts.push(`${resizedURL} ${size.width * dpr}w`);
            }

            if (size.media) {
                sizeAlts.push(`${size.media} ${size.width}px`);
            }
        });

        // Push the default size at the end.
        if (defaultSize) {
            sizeAlts.push(`${defaultSize.width}px`);
        }

        srcSet = srcSetAlts.join(', ');
        sizesAttr = sizeAlts.join(', ');

        // If we don't know the size of the image, we can try reading it from the
        // image itself.
        if (!source.size) {
            const size = await getImageSize(source.src, {
                width: defaultSize?.width,
                dpr: 3,
            });
            if (size) {
                source.size = size;
            }
        }
    }

    // Avoid layout shift by setting the width and height attributes,
    // or the aspect ratio.
    const sizeAttrs: Partial<React.ComponentPropsWithoutRef<'img'>> = {};
    if (source.size && 'width' in source.size && 'height' in source.size) {
        // Set the width and height attributes if we know them.
        sizeAttrs.width = source.size.width;
        sizeAttrs.height = source.size.height;
    } else if (source.size && 'aspectRatio' in source.size) {
        // Or fallback to the aspect ratio.
        sizeAttrs.style = {
            aspectRatio: source.size.aspectRatio,
        };
    }

    // Preload the image if needed.
    if (priority === 'high' || preload) {
        ReactDOM.preload(src, {
            as: 'image',
            imageSrcSet: srcSet,
            imageSizes: sizesAttr,
            fetchPriority: priority === 'high' ? 'high' : 'low',
        });
    }

    return (
        <img
            srcSet={srcSet}
            sizes={sizesAttr}
            src={src}
            alt={alt}
            {...(priority === 'lazy' ? { loading: 'lazy', fetchPriority: 'low' } : {})}
            {...(priority === 'high' ? { fetchPriority: 'high' } : {})}
            {...rest}
            {...sizeAttrs}
        />
    );
}
