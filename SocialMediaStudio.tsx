/**
 * Social Media Studio — VizionIt Pro
 * Generates platform-specific marketing content from staged room images.
 * LinkedIn Carousel adapted from carousel design patterns.
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Instagram,
    Facebook,
    Linkedin,
    Sparkles,
    Loader2,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Share2,
    FileText,
    X,
    Globe,
    ThumbsUp,
    MessageSquare,
    Repeat2,
    Send,
    Hash,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Capture a card element as PNG using html-to-image.
 * Uses SVG foreignObject — the BROWSER renders all CSS (oklch, oklab, everything).
 * html-to-image handles base64 data URLs natively — no conversion needed.
 */
async function captureCard(el: HTMLElement, filename: string) {
    const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Capture an element as a PNG data URL (for PDF embedding).
 */
async function captureToDataUrl(el: HTMLElement): Promise<string> {
    return await toPng(el, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
    });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface StagedResult {
    imageUrl: string;
    description: string;
}

interface SocialContent {
    post?: string;
    headline?: string;
    hashtags?: string[];
    slides?: Array<{ title: string; description: string; badge?: string }>;
    caption?: string; // carousel LinkedIn caption
}

interface Props {
    results: Record<string, StagedResult>;
    productName: string;
    productStyle: string;
}

type Platform = 'instagram' | 'facebook' | 'linkedin' | 'carousel';

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = useCallback(() => {
        navigator.clipboard.writeText(text).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [text]);

    return (
        <button
            onClick={copy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-600 transition text-[10px] font-bold"
        >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'COPIED' : 'COPY'}
        </button>
    );
}

// ─── Platform Tab Button ──────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'from-pink-500 to-orange-400' },
    { id: 'facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" />, color: 'from-blue-600 to-blue-500' },
    { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: 'from-sky-600 to-sky-500' },
    { id: 'carousel', label: 'LI Carousel', icon: <Linkedin className="w-4 h-4" />, color: 'from-indigo-600 to-blue-600' },
];

// ─── Instagram Preview ────────────────────────────────────────────────────────

function InstagramPreview({ imageUrl, content }: { imageUrl: string; content: SocialContent }) {
    const hashString = (content.hashtags || []).map(h => `#${h.replace(/^#+/, '')}`).join(' ');
    const fullPost = `${content.post || ''}\n\n${hashString}`;
    const cardRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    const downloadCard = async () => {
        if (!cardRef.current) return;
        setDownloading(true);
        try {
            await captureCard(cardRef.current, 'instagram-post.png');
        } catch (e) { console.error(e); }
        finally { setDownloading(false); }
    };

    return (
        <div className="max-w-sm mx-auto">
            <div ref={cardRef} className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 p-3 border-b">
                    <img src="/aurelian-logo.png" alt="Aurelian" className="w-14 h-14 rounded-full object-contain bg-white border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                    <div>
                        <p className="text-[11px] font-bold text-gray-900">Aurelian Lighting Fixture Corporation</p>
                        <p className="text-[9px] text-gray-400">Sponsored</p>
                    </div>
                    <span className="ml-auto text-gray-400 text-lg">···</span>
                </div>
                {/* Square Image */}
                <div className="aspect-square bg-slate-900 overflow-hidden">
                    <img src={imageUrl} alt="staged" className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
                {/* Actions */}
                <div className="flex gap-4 px-3 pt-2 pb-1 text-gray-700">
                    <ThumbsUp className="w-5 h-5" /><MessageSquare className="w-5 h-5" /><Send className="w-5 h-5" />
                    <Repeat2 className="w-5 h-5 ml-auto" />
                </div>
                {/* Caption */}
                <div className="px-3 pb-3">
                    {content.headline && <p className="text-[11px] font-bold text-gray-900 mb-1">{content.headline}</p>}
                    <p className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">{content.post}</p>
                    <p className="text-[10px] text-blue-500 mt-1 leading-relaxed">{hashString}</p>
                </div>
            </div>
            {/* Download row outside card */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <button
                    onClick={downloadCard}
                    disabled={downloading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-500 text-white text-[10px] font-bold hover:bg-pink-600 disabled:opacity-50 transition"
                >
                    {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {downloading ? 'Saving...' : 'Download PNG'}
                </button>
                <button
                    onClick={() => {
                        const text = encodeURIComponent(fullPost);
                        window.open(`https://www.instagram.com/`, '_blank');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 text-white text-[10px] font-bold hover:opacity-90 transition"
                >
                    <Instagram className="w-3 h-3" /> Open Instagram
                </button>
                <CopyButton text={fullPost} />
            </div>
        </div>
    );
}

// ─── Facebook Preview ─────────────────────────────────────────────────────────

function FacebookPreview({ imageUrl, content }: { imageUrl: string; content: SocialContent }) {
    const hashString = (content.hashtags || []).map(h => `#${h.replace(/^#+/, '')}`).join(' ');
    const fullPost = `${content.post || ''}\n\n${hashString}`;
    const cardRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    const downloadCard = async () => {
        if (!cardRef.current) return;
        setDownloading(true);
        try {
            await captureCard(cardRef.current, 'facebook-post.png');
        } catch (e) { console.error(e); }
        finally { setDownloading(false); }
    };

    return (
        <div className="max-w-lg mx-auto">
            <div ref={cardRef} className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-3 p-4 border-b">
                    <img src="/aurelian-logo.png" alt="Aurelian" className="w-14 h-14 rounded-full object-contain bg-white border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                    <div>
                        <p className="text-sm font-bold text-gray-900">Aurelian Lighting Fixture Corporation</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">Just now · <Globe className="w-3 h-3" /></p>
                    </div>
                    <span className="ml-auto text-gray-400 text-xl">···</span>
                </div>
                <div className="px-4 py-3">
                    {content.headline && <p className="text-sm font-bold text-gray-900 mb-1">{content.headline}</p>}
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content.post}</p>
                    <p className="text-sm text-blue-600 mt-2">{hashString}</p>
                </div>
                <div className="aspect-video bg-slate-900 overflow-hidden">
                    <img src={imageUrl} alt="staged" className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
                <div className="flex justify-between px-4 py-2 border-t text-gray-500 text-xs font-semibold">
                    <button className="flex items-center gap-1 hover:text-blue-600 transition"><ThumbsUp className="w-4 h-4" /> Like</button>
                    <button className="flex items-center gap-1 hover:text-blue-600 transition"><MessageSquare className="w-4 h-4" /> Comment</button>
                    <button className="flex items-center gap-1 hover:text-blue-600 transition"><Share2 className="w-4 h-4" /> Share</button>
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
                <button
                    onClick={downloadCard}
                    disabled={downloading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                >
                    {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {downloading ? 'Saving...' : 'Download PNG'}
                </button>
                <button
                    onClick={() => {
                        window.open(`https://www.facebook.com/`, '_blank');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 text-white text-[10px] font-bold hover:bg-blue-800 transition"
                >
                    <Facebook className="w-3 h-3" /> Open Facebook
                </button>
                <CopyButton text={fullPost} />
            </div>
        </div>
    );
}

// ─── LinkedIn Preview ─────────────────────────────────────────────────────────

function LinkedInPreview({ imageUrl, content }: { imageUrl: string; content: SocialContent }) {
    const hashString = (content.hashtags || []).map(h => `#${h.replace(/^#+/, '')}`).join(' ');
    const fullPost = `${content.post || ''}\n\n${hashString}`;
    const cardRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    const downloadCard = async () => {
        if (!cardRef.current) return;
        setDownloading(true);
        try {
            await captureCard(cardRef.current, 'linkedin-post.png');
        } catch (e) { console.error(e); }
        finally { setDownloading(false); }
    };

    return (
        <div className="max-w-lg mx-auto">
            <div ref={cardRef} className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-3 p-4 border-b">
                    <img src="/aurelian-logo.png" alt="Aurelian" className="w-16 h-16 rounded-lg object-contain bg-white border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                    <div>
                        <p className="text-sm font-bold text-gray-900">Aurelian Lighting Fixture Corporation</p>
                        <p className="text-[10px] text-gray-500">Luxury Lighting Design · 2h · <Globe className="inline w-3 h-3" /></p>
                    </div>
                    <button className="ml-auto px-4 py-1.5 border border-blue-600 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-50 transition">+ Follow</button>
                </div>
                <div className="px-4 py-3">
                    {content.headline && <p className="text-sm font-bold text-gray-900 mb-2">{content.headline}</p>}
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content.post}</p>
                    <p className="text-sm text-blue-600 mt-2 font-medium">{hashString}</p>
                </div>
                <div className="aspect-video bg-slate-900 overflow-hidden mx-4 rounded-xl mb-3">
                    <img src={imageUrl} alt="staged" className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
                <div className="flex justify-between px-4 py-2 border-t text-gray-500 text-xs font-semibold">
                    <button className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> Like</button>
                    <button className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Comment</button>
                    <button className="flex items-center gap-1"><Repeat2 className="w-4 h-4" /> Repost</button>
                    <button className="flex items-center gap-1"><Send className="w-4 h-4" /> Send</button>
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
                <button
                    onClick={downloadCard}
                    disabled={downloading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-[10px] font-bold hover:bg-sky-700 disabled:opacity-50 transition"
                >
                    {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {downloading ? 'Saving...' : 'Download PNG'}
                </button>
                <button
                    onClick={() => {
                        const text = encodeURIComponent(fullPost);
                        window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-[10px] font-bold hover:bg-slate-600 transition"
                >
                    <Linkedin className="w-3 h-3" /> Post to LinkedIn
                </button>
                <CopyButton text={fullPost} />
            </div>
        </div>
    );
}

// ─── LinkedIn Carousel ────────────────────────────────────────────────────────

function LinkedInCarousel({
    content,
    results,
}: {
    content: SocialContent;
    results: Record<string, StagedResult>;
}) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const slideRef = useRef<HTMLDivElement>(null);

    const slides = content.slides || [];
    const roomImages = Object.values(results).map(r => r.imageUrl);
    const caption = content.caption || '';
    const hashString = (content.hashtags || []).map(h => `#${h.replace(/^#+/, '')}`).join(' ');

    const getSlideImage = (index: number) => roomImages[index % roomImages.length] || roomImages[0];

    const prev = () => setCurrentSlide(p => (p - 1 + slides.length) % slides.length);
    const next = () => setCurrentSlide(p => (p + 1) % slides.length);

    const exportPDF = async () => {
        if (!slideRef.current || slides.length === 0) return;
        setIsExporting(true);
        setShowExportMenu(false);
        try {
            const doc = new jsPDF('p', 'px', [800, 800]);
            for (let i = 0; i < slides.length; i++) {
                setCurrentSlide(i);
                await new Promise(r => setTimeout(r, 800));
                if (slideRef.current) {
                    const dataUrl = await captureToDataUrl(slideRef.current);
                    if (i > 0) doc.addPage([800, 800], 'p');
                    doc.addImage(dataUrl, 'PNG', 0, 0, 800, 800);
                }
            }
            doc.save('aurelian-linkedin-carousel.pdf');
        } catch (e) {
            console.error('PDF export error:', e);
        } finally {
            setIsExporting(false);
        }
    };

    const downloadCurrentPNG = async () => {
        if (!slideRef.current) return;
        setIsExporting(true);
        try {
            await captureCard(slideRef.current, `carousel-slide-${currentSlide + 1}.png`);
        } catch (e) { console.error(e); }
        finally { setIsExporting(false); }
    };

    const shareToLinkedIn = () => {
        const text = encodeURIComponent(`${caption} ${hashString}`);
        window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
        setShowExportMenu(false);
    };

    if (slides.length === 0) return null;
    const slide = slides[currentSlide];
    const imgUrl = getSlideImage(currentSlide);

    return (
        <div className="max-w-md mx-auto">
            {/* Slide */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-neutral-200">
                <div
                    ref={slideRef}
                    className="relative aspect-square bg-slate-900 overflow-hidden group"
                >
                    <img
                        src={imgUrl}
                        alt={slide.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    <div className="absolute inset-0 p-10 flex flex-col justify-end">
                        {currentSlide === 0 && slide.badge && (
                            <span className="inline-block mb-3 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold tracking-widest uppercase self-start">
                                {slide.badge}
                            </span>
                        )}
                        <h2 className="text-white text-3xl font-black leading-tight drop-shadow-md mb-3">{slide.title}</h2>
                        <p className="text-white/90 text-base leading-relaxed drop-shadow-sm">{slide.description}</p>
                    </div>

                    {/* Counter */}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/20">
                        {currentSlide + 1} / {slides.length}
                    </div>

                    {/* Nav */}
                    <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/90 text-white hover:text-slate-900 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl transition-all">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/90 text-white hover:text-slate-900 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl transition-all">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Dots */}
                <div className="flex items-center justify-center gap-2 py-4 bg-neutral-50 border-b border-neutral-100">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-blue-600' : 'w-2 bg-neutral-300 hover:bg-neutral-400'}`}
                        />
                    ))}
                </div>

                {/* LinkedIn Social Footer */}
                <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <img src="/aurelian-logo.png" alt="Aurelian" className="w-16 h-16 rounded-lg object-contain bg-white border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                        <div>
                            <p className="text-sm font-bold text-gray-900">Aurelian Lighting Fixture Corporation</p>
                            <p className="text-[10px] text-gray-400">Luxury Lighting Design · 2h · <Globe className="inline w-3 h-3" /></p>
                        </div>
                        <button className="ml-auto px-3 py-1 border border-blue-600 text-blue-600 rounded-full text-xs font-bold">+ Follow</button>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed mb-1">{caption}</p>
                    <p className="text-xs text-blue-600 font-medium">{hashString}</p>
                    <div className="flex justify-between pt-3 border-t border-neutral-100 text-neutral-500 mt-3">
                        {[{ icon: <ThumbsUp className="w-4 h-4" />, label: 'Like' }, { icon: <MessageSquare className="w-4 h-4" />, label: 'Comment' }, { icon: <Repeat2 className="w-4 h-4" />, label: 'Repost' }, { icon: <Send className="w-4 h-4" />, label: 'Send' }].map(b => (
                            <button key={b.label} className="flex-1 py-1.5 flex items-center justify-center gap-1 hover:bg-neutral-50 rounded text-xs font-semibold transition-colors">{b.icon}{b.label}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <button
                    onClick={exportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                    {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    {isExporting ? 'Processing...' : 'Download PDF'}
                </button>
                <button
                    onClick={shareToLinkedIn}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-[10px] font-bold hover:bg-slate-600 transition"
                >
                    <Linkedin className="w-3 h-3" /> Post to LinkedIn
                </button>
                <CopyButton text={`${caption}\n\n${hashString}`} />
            </div>

            {isExporting && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-[200]">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                    <p className="text-white text-lg font-bold">Rendering slides...</p>
                    <p className="text-slate-400 text-sm mt-1">Please wait</p>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SocialMediaStudio({ results, productName, productStyle }: Props) {
    const [platform, setPlatform] = useState<Platform>('instagram');
    const [selectedRoom, setSelectedRoom] = useState<string>('');
    const [content, setContent] = useState<SocialContent | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    const roomNames = Object.keys(results).filter(r => results[r]?.imageUrl);
    const activeRoom = selectedRoom || roomNames[0] || '';
    const activeResult = results[activeRoom];

    const generate = async () => {
        if (!activeResult) return;
        if (!activeResult.imageUrl) {
            setError('This room scene failed to generate. Please re-generate it first.');
            return;
        }
        setIsGenerating(true);
        setError(null);
        setContent(null);
        try {
            const base64 = activeResult.imageUrl.split(',')[1];
            if (!base64) {
                throw new Error('Invalid image data. Please re-generate this room scene.');
            }
            const res = await fetch('/api/social', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base64Image: base64,
                    platform,
                    productName,
                    productStyle,
                    room: activeRoom,
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setContent(data);
        } catch (e: any) {
            setError(e.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const hasResults = roomNames.length > 0;

    return (
        <div className="mb-8 bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-lg">
            {/* Header */}
            <button
                onClick={() => setIsOpen(p => !p)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition"
            >
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-orange-400" />
                        <div className="w-5 h-5 rounded-full bg-blue-600" />
                        <div className="w-5 h-5 rounded-full bg-sky-600" />
                    </div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Social Media Studio</h2>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-900/50 border border-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">AI-Powered</span>
                </div>
                <div className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 border-t border-slate-700">
                            {!hasResults && (
                                <div className="py-8 text-center text-slate-500 text-sm">
                                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    Generate at least one room staging below, then come back here to create your social media posts.
                                </div>
                            )}

                            {hasResults && (
                                <div className="pt-5 space-y-5">
                                    {/* Controls Row */}
                                    <div className="flex flex-wrap gap-4 items-end">
                                        {/* Platform Tabs */}
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Platform</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {PLATFORMS.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => { setPlatform(p.id); setContent(null); }}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border
                              ${platform === p.id
                                                                ? `bg-gradient-to-r ${p.color} text-white border-transparent shadow-lg`
                                                                : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-500'}`}
                                                    >
                                                        {p.icon} {p.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Room Picker */}
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Room Image</p>
                                            <select
                                                value={activeRoom}
                                                onChange={e => { setSelectedRoom(e.target.value); setContent(null); }}
                                                className="bg-slate-800 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 ring-indigo-500/30"
                                            >
                                                {roomNames.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>

                                        {/* Generate */}
                                        <button
                                            onClick={generate}
                                            disabled={isGenerating}
                                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all shadow-lg"
                                        >
                                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            {isGenerating ? 'Generating...' : 'Generate Post'}
                                        </button>
                                    </div>

                                    {/* Error */}
                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-xl text-red-400 text-sm">
                                            <X className="w-4 h-4 shrink-0" /> {error}
                                        </div>
                                    )}

                                    {/* Preview */}
                                    <AnimatePresence mode="wait">
                                        {content && (
                                            <motion.div
                                                key={platform}
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="pt-2"
                                            >
                                                {platform === 'instagram' && (
                                                    <InstagramPreview imageUrl={activeResult.imageUrl} content={content} />
                                                )}
                                                {platform === 'facebook' && (
                                                    <FacebookPreview imageUrl={activeResult.imageUrl} content={content} />
                                                )}
                                                {platform === 'linkedin' && (
                                                    <LinkedInPreview imageUrl={activeResult.imageUrl} content={content} />
                                                )}
                                                {platform === 'carousel' && (
                                                    <LinkedInCarousel content={content} results={results} />
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
