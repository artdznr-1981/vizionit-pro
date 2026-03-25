/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Download,
  Sparkles,
  Settings2,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Info,
  Star,
  FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Markdown from 'react-markdown';
import * as XLSX from 'xlsx';
import { generateStagedImage, analyzeProductImage, StagingConfig } from './services/ai-client';
import SocialMediaStudio from './SocialMediaStudio';

const ROOMS = [
  "Kitchen", "Bedroom", "Sunroom", "Living Room",
  "Dining Room", "Entry", "Back Porch - Outdoor Living", "Eat-in Dining nook",
  "Front Porch", "Office", "Covered Patio / Pergola", "Pool & Cabana"
];

const STYLES = [
  "Transitional", "Modern", "Contemporary", "Industrial",
  "Traditional", "Art Deco", "Sustainable Organic", "Modern Farmhouse", "Modern Retro"
];

export default function App() {
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<Omit<StagingConfig, 'room'>>({
    intensity: 85,
    temp: "Warm (2700K)",
    style: "Transitional",
    customDetail: ""
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, { imageUrl: string; description: string }>>({});
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [coverRoom, setCoverRoom] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nameStatus, setNameStatus] = useState<'original' | 'revised' | null>(null);
  const [productInfo, setProductInfo] = useState({
    name: "",
    fixtureType: "",
    style: "",
    dimensions: "",
    bulbs: "",
    hangingHeight: "",
    location: "",
    finishColor: "",
    shade: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  // Map a column header string to a productInfo field key
  const mapColumnToField = (header: string): keyof typeof productInfo | null => {
    const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (h.includes('productname') || h === 'name') return 'name';
    if (h.includes('designstyle') || h.includes('style')) return 'style';
    if (h.includes('dimension') || h.includes('size')) return 'dimensions';
    if (h.includes('bulb')) return 'bulbs';
    if (h.includes('hanging') || h.includes('height')) return 'hangingHeight';
    if (h.includes('etl') || h.includes('location') || h.includes('listing')) return 'location';
    if (h.includes('finish') || h.includes('color')) return 'finishColor';
    if (h.includes('shade')) return 'shade';
    return null;
  };

  const handleSheetUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
          alert('Spreadsheet must have a header row and at least one data row.');
          return;
        }

        const headers: string[] = rows[0].map((h: any) => String(h ?? ''));
        const dataRow: any[] = rows[1];

        const newInfo = { ...productInfo };
        let matched = 0;
        headers.forEach((header, i) => {
          const field = mapColumnToField(header);
          if (field && dataRow[i] !== undefined && dataRow[i] !== null && dataRow[i] !== '') {
            (newInfo as any)[field] = String(dataRow[i]);
            matched++;
          }
        });

        if (matched === 0) {
          alert('No matching columns found. Expected headers like: Product Name, Design Style, Dimensions, Bulbs, Hanging Height, ETL Listing Location, Finish Color, Shade');
          return;
        }

        setProductInfo(newInfo);
        setNameStatus(null);
      } catch (err) {
        console.error('Spreadsheet parse error:', err);
        alert('Failed to read spreadsheet. Please use a valid .xlsx or .csv file.');
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset so same file can be re-uploaded
    event.target.value = '';
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
      const base64 = result.split(',')[1];
      setBase64Image(base64);

      // Auto-analyze
      setIsAnalyzing(true);
      setNameStatus(null);
      try {
        const specs = await analyzeProductImage(base64);
        // Extract nameStatus before setting productInfo (it's not a product field)
        const status = (specs as any).nameStatus || null;
        setNameStatus(status);
        // Remove nameStatus from the specs object before setting productInfo
        const { nameStatus: _, ...cleanSpecs } = specs as any;
        setProductInfo(cleanSpecs);
        // Auto-select the Architectural Style dropdown to match AI-detected style
        const detectedStyle = (cleanSpecs as any).style || "";
        const lowerDetected = detectedStyle.toLowerCase();
        let matchedStyle = STYLES.find(s => s.toLowerCase() === lowerDetected);
        if (!matchedStyle) {
          matchedStyle = STYLES.find(s => lowerDetected.includes(s.toLowerCase()));
        }
        if (matchedStyle) {
          setConfig(prev => ({ ...prev, style: matchedStyle }));
        }
      } catch (error) {
        console.error("Analysis failed:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (room: string) => {
    if (!base64Image) return;

    setIsGenerating(true);
    setActiveRoom(room);

    try {
      const res = await generateStagedImage(base64Image, {
        ...config,
        room,
        productName: productInfo.name,
        productStyle: productInfo.style,
        fixtureType: productInfo.fixtureType,
        customDetail: `${config.customDetail}. Product Name: ${productInfo.name}`
      });
      setResults(prev => ({ ...prev, [room]: res }));
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate image. Please check your API key and connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAll = async () => {
    if (!base64Image || isGenerating) return;

    setIsGenerating(true);

    try {
      for (const room of ROOMS) {
        if (!results[room]) {
          setActiveRoom(room);
          const res = await generateStagedImage(base64Image, {
            ...config,
            room,
            productName: productInfo.name,
            productStyle: productInfo.style,
            fixtureType: productInfo.fixtureType,
            customDetail: `${config.customDetail}. Product Name: ${productInfo.name}`
          });
          setResults(prev => ({ ...prev, [room]: res }));
          // Increased delay for free tier stability
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
    } catch (error: any) {
      console.error("Batch generation failed:", error);
      const isRateLimit = error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
      alert(isRateLimit
        ? "Rate limit reached. The AI is busy, please wait a minute and try again."
        : "Generation failed. Please check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Brand color: muted slate-navy (modern, works with gray)
    const brand = { r: 61, g: 90, b: 128 }; // #3D5A80

    // Preload logo image
    let logoDataUrl: string | null = null;
    try {
      const logoResp = await fetch('/aurelian-logo.png');
      const logoBlob = await logoResp.blob();
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
    } catch (e) {
      console.error('Failed to load logo', e);
    }

    // Helper to draw logo in page header
    const drawHeaderLogo = () => {
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, 'PNG', margin, 6, 32, 32);
        } catch (e) {
          // Fallback to text
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(brand.r, brand.g, brand.b);
          doc.text("AURELIAN", margin, 18);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(148, 163, 184);
          doc.text("LIGHTING FIXTURE CORPORATION", margin + 28, 18);
        }
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(brand.r, brand.g, brand.b);
        doc.text("AURELIAN", margin, 18);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("LIGHTING FIXTURE CORPORATION", margin + 28, 18);
      }
    };

    const cleanDescription = (text: string) => {
      let cleaned = text.replace(/Luxury Marketing Description:?/gi, "");
      cleaned = cleaned.replace(/#{1,6}\s+/g, ""); // Remove ### headings
      cleaned = cleaned.replace(/\*\*/g, "");       // Remove ** bold markers
      cleaned = cleaned.replace(/\*/g, "");          // Remove * italic markers
      cleaned = cleaned.replace(/calibrated/gi, "");
      cleaned = cleaned.replace(/light source/gi, "illumination");
      cleaned = cleaned.replace(/\d+K/gi, "");
      cleaned = cleaned.replace(/at \d+%\s*intensity/gi, "");
      cleaned = cleaned.replace(/intensity/gi, "glow");
      cleaned = cleaned.replace(/precisely/gi, "");
      cleaned = cleaned.replace(/\n{2,}/g, " ");    // Collapse double newlines
      return cleaned.trim();
    };

    // Helper: crop an image to a target aspect ratio from center using canvas
    const cropImage = (imageUrl: string, targetAspect: number, zoomFactor = 1, verticalBias = 0.5): string => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = imageUrl;
        if (!ctx || img.naturalWidth === 0) return imageUrl;

        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = 1 / zoomFactor;
        let sw = iw * scale;
        let sh = sw / targetAspect;
        if (sh > ih * scale) {
          sh = ih * scale;
          sw = sh * targetAspect;
        }
        const sx = (iw - sw) / 2;
        // verticalBias: 0 = top, 0.5 = center, 1 = bottom
        const sy = (ih - sh) * verticalBias;
        canvas.width = Math.round(sw);
        canvas.height = Math.round(sh);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
      } catch (e) {
        console.error("Crop error", e);
      }
      return imageUrl;
    };

    // Get first room scene for cover
    const firstResult = Object.values(results)[0];

    // ═══════════════════════════════════════════
    // PAGE 1: COVER PAGE
    // ═══════════════════════════════════════════

    // Full page subtle warm background
    doc.setFillColor(250, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Solid blue border frame on all edges (5mm thick)
    const borderW = 5;
    doc.setFillColor(brand.r, brand.g, brand.b);
    doc.rect(0, 0, pageWidth, borderW, 'F');           // Top
    doc.rect(0, pageHeight - borderW, pageWidth, borderW, 'F'); // Bottom
    doc.rect(0, 0, borderW, pageHeight, 'F');           // Left
    doc.rect(pageWidth - borderW, 0, borderW, pageHeight, 'F'); // Right

    // Cover logo + hero positioning
    const coverLogoSize = 75;
    const heroTop = borderW + coverLogoSize + 5; // Fixed hero position below logo area
    const logoTop = borderW + (heroTop - borderW - coverLogoSize) / 2; // Center logo between border and image
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', (pageWidth - coverLogoSize) / 2, logoTop, coverLogoSize, coverLogoSize);
      } catch (e) {
        console.error('Cover logo error', e);
      }
    }

    // Cover hero image
    const coverResult = coverRoom && results[coverRoom] ? results[coverRoom] : firstResult;
    const coverImageSrc = coverResult?.imageUrl || previewUrl;
    const heroW = pageWidth - (borderW * 2);
    const heroH = heroW * 0.65;
    const heroX = borderW;
    if (coverImageSrc) {
      try {
        const croppedCover = cropImage(coverImageSrc, heroW / heroH);
        doc.addImage(croppedCover, 'PNG', heroX, heroTop, heroW, heroH);
      } catch (e) {
        console.error("Cover image error", e);
      }
    }

    // Product name — pushed down below image with generous spacing
    const textTop = coverImageSrc ? heroTop + heroH + 12 : 120;
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(30, 41, 59);
    const nameLines = doc.splitTextToSize(productInfo.name || "Product Catalog", contentWidth - 30);
    doc.text(nameLines, pageWidth / 2, textTop, { align: "center" });

    // Wider accent line under name
    const accentY = textTop + (nameLines.length * 11) + 6;
    doc.setDrawColor(brand.r, brand.g, brand.b);
    doc.setLineWidth(1.2);
    doc.line(pageWidth / 2 - 35, accentY, pageWidth / 2 + 35, accentY);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Product Specification Catalog", pageWidth / 2, accentY + 14, { align: "center" });

    // Style badge
    if (productInfo.style) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(brand.r, brand.g, brand.b);
      doc.text(productInfo.style.toUpperCase() + "  COLLECTION", pageWidth / 2, accentY + 24, { align: "center" });
    }

    // Cover footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("CONFIDENTIAL  ©  2026  •  FOR PROFESSIONAL USE ONLY", pageWidth / 2, pageHeight - 12, { align: "center" });

    // ═══════════════════════════════════════════
    // PAGE 2: PRODUCT SPECIFICATIONS
    // ═══════════════════════════════════════════
    doc.addPage();

    // Subtle background
    doc.setFillColor(250, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Top accent bar
    doc.setFillColor(brand.r, brand.g, brand.b);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Header logo
    drawHeaderLogo();

    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("Product Specifications", margin, 38);

    // Accent line
    doc.setDrawColor(brand.r, brand.g, brand.b);
    doc.setLineWidth(1);
    doc.line(margin, 42, margin + 50, 42);

    // Specs in two-column card grid
    const specs = [
      { label: "Design Style", value: productInfo.style },
      { label: "Finish Color", value: productInfo.finishColor },
      { label: "Shade", value: productInfo.shade },
      { label: "Dimensions", value: productInfo.dimensions },
      { label: "Bulb Specifications", value: productInfo.bulbs },
      {
        label: "Hanging Height", value: (() => {
          const h = productInfo.hangingHeight || "";
          const parts = h.split(/\s*[-–—\/to]+\s*/i).filter(Boolean);
          if (parts.length >= 2) return `MIN: ${parts[0].trim()}  MAX: ${parts[1].trim()}`;
          return h;
        })()
      },
      { label: "ETL Listing Location", value: productInfo.location },
    ];

    const cardW = (contentWidth - 8) / 2;
    const cardH = 28;
    const cardPadding = 6;
    const cardY = 52;

    specs.forEach((spec, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + (col * (cardW + 8));
      const currentY = cardY + (row * (cardH + 6));

      // Card background
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.roundedRect(x, currentY, cardW, cardH, 3, 3, 'F');

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(spec.label.toUpperCase() + ":", x + cardPadding, currentY + 10);

      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const valueText = doc.splitTextToSize(spec.value || "N/A", cardW - (cardPadding * 2));
      doc.text(valueText[0] || "N/A", x + cardPadding, currentY + 20);
    });

    // ═══════════════════════════════════════════
    // PAGES 3+: ROOM STAGING PAGES
    // ═══════════════════════════════════════════

    Object.entries(results).forEach(([room, data], index) => {
      doc.addPage();

      // Subtle background
      doc.setFillColor(250, 250, 252);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top accent bar
      doc.setFillColor(brand.r, brand.g, brand.b);
      doc.rect(0, 0, pageWidth, 4, 'F');

      // Header logo
      drawHeaderLogo();

      // Room name - large elegant serif
      doc.setFont("times", "bold");
      doc.setFontSize(24);
      doc.setTextColor(30, 41, 59);
      doc.text(room, margin, 38);

      // Accent line
      doc.setDrawColor(brand.r, brand.g, brand.b);
      doc.setLineWidth(1);
      doc.line(margin, 42, margin + 40, 42);

      // Marketing copy in elegant italic (min 4 lines, end on complete sentence)
      let y = 52;
      const description = cleanDescription(data.description);
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(description, contentWidth);
      const minLines = 4;
      const maxLines = 8;
      const linesToShow = Math.max(minLines, Math.min(splitText.length, maxLines));
      let textLines = splitText.slice(0, linesToShow);
      // Trim to last complete sentence (ends with . ! or ?)
      const joined = textLines.join(' ');
      const lastSentenceEnd = Math.max(joined.lastIndexOf('.'), joined.lastIndexOf('!'), joined.lastIndexOf('?'));
      if (lastSentenceEnd > 0) {
        const trimmed = joined.substring(0, lastSentenceEnd + 1);
        textLines = doc.splitTextToSize(trimmed, contentWidth);
      }
      while (textLines.length < minLines) textLines.push("");
      doc.text(textLines, margin, y);
      y += (textLines.length * 5) + 8;

      // Stacked Image Layout: Landscape top, full scene + detail view below
      try {
        const roomMargin = 25;
        const roomContentW = pageWidth - (roomMargin * 2);
        const imgAvailableHeight = pageHeight - y - 30;
        const vertGap = 1;
        const detailGap = 1;

        // Bottom panels: left is square full scene, right is detail zoom
        // Calculate bottom panel size first so top aligns
        const bottomH = imgAvailableHeight * 0.45;
        const leftW = bottomH; // Square: width = height
        const rightW = roomContentW - leftW - detailGap;

        // Top: landscape crop, biased toward top so fixture isn't cut off
        const topH = imgAvailableHeight - bottomH - vertGap;
        const topCrop = cropImage(data.imageUrl, roomContentW / topH, 1, 0.15);

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(roomMargin - 0.5, y - 0.5, roomContentW + 1, topH + 1, 2, 2, 'D');
        doc.addImage(topCrop, 'PNG', roomMargin, y, roomContentW, topH);

        y += topH + vertGap;

        // Bottom-left: full square scene (uncropped, no label)
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(roomMargin - 0.5, y - 0.5, leftW + 1, bottomH + 1, 2, 2, 'D');
        doc.addImage(data.imageUrl, 'PNG', roomMargin, y, leftW, bottomH);

        // Infer fixture type from product info to optimally frame the detail crop
        // - Wall sconces: product is mid-wall → center bias
        // - Flush/semi-flush: product is at ceiling top → top bias
        // - Hanging/pendant/chandelier: product hangs from top → upper bias
        // - Unknown: slight upper bias as safe default
        const nameAndStyle = `${productInfo.name} ${productInfo.style} ${productInfo.shade}`.toLowerCase();
        const isWallMount = nameAndStyle.includes('sconce') || nameAndStyle.includes('wall') || nameAndStyle.includes('bracket');
        const isFlushMount = nameAndStyle.includes('flush') || nameAndStyle.includes('surface') || nameAndStyle.includes('ceiling mount');
        const isHanging = !isWallMount && !isFlushMount && productInfo.hangingHeight && productInfo.hangingHeight.trim() !== '';

        const detailVerticalBias = isWallMount ? 0.45   // sconces sit mid-wall
          : isFlushMount ? 0.2   // flush mounts are at the very top
            : isHanging ? 0.28     // pendants/chandeliers hang from above
              : 0.38;                // safe default: slight upper bias

        // Bottom-right: detail view — product-type-aware centering
        const detailCrop = cropImage(data.imageUrl, rightW / bottomH, 1.8, detailVerticalBias);
        doc.roundedRect(roomMargin + leftW + detailGap - 0.5, y - 0.5, rightW + 1, bottomH + 1, 2, 2, 'D');
        doc.addImage(detailCrop, 'PNG', roomMargin + leftW + detailGap, y, rightW, bottomH);

        // Detail view label only
        doc.setFillColor(brand.r, brand.g, brand.b);
        doc.roundedRect(roomMargin + leftW + detailGap + 2, y + bottomH - 9, 28, 7, 1, 1, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(255, 255, 255);
        doc.text("DETAIL VIEW", roomMargin + leftW + detailGap + 5, y + bottomH - 4);

      } catch (e) {
        console.error("Error adding image to PDF", e);
      }
    });

    // ═══════════════════════════════════════════
    // FOOTER ON ALL PAGES
    // ═══════════════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);

      // Bottom separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("AURELIAN LIGHTING FIXTURE CORPORATION  ©  2026", margin, pageHeight - 10);
      doc.text(`${i - 1}  /  ${totalPages - 1}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    doc.save(`${productInfo.name || 'VizionIt'}-Catalog.pdf`);
  };

  const downloadAllImages = async () => {
    if (Object.keys(results).length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder("staged-images");

    if (!folder) return;

    Object.entries(results).forEach(([room, data]) => {
      // Extract base64 data from data URL
      const base64Data = data.imageUrl.split(',')[1];
      folder.file(`${room.toLowerCase().replace(/\s+/g, '-')}.png`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "VizionIt-Pro-Staging-Bundle.zip");
  };

  const downloadAllCopy = () => {
    if (Object.keys(results).length === 0) return;
    const cleanText = (text: string) =>
      text
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/calibrated/gi, "")
        .replace(/light source/gi, "illumination")
        .replace(/\d+K/gi, "")
        .replace(/at \d+%\s*intensity/gi, "")
        .replace(/intensity/gi, "glow")
        .replace(/precisely/gi, "")
        .trim();
    const productLine = productInfo.name ? `Product: ${productInfo.name}` : "VizionIt Pro";
    const styleLine   = productInfo.style ? `  |  Style: ${productInfo.style}` : "";
    const separator   = "═".repeat(60);
    const divider     = "─".repeat(60);
    let output = `${separator}\nVIZIONIT PRO — MARKETING COPY\n${productLine}${styleLine}\n${separator}\n\n`;
    Object.entries(results).forEach(([room, data]) => {
      if (!data.description) return;
      output += `${room.toUpperCase()}\n${divider}\n${cleanText(data.description)}\n\n`;
    });
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${productInfo.name || "VizionIt"}-Marketing-Copy.txt`);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-950">
      <div className="max-w-7xl mx-auto p-4 md:p-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 pb-6 border-b border-slate-700 gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Camera className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-indigo-400 italic tracking-tighter">VIZIONIT PRO</h1>
            <div className="text-emerald-500 flex items-center gap-1 ml-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Secure Suite</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={downloadPDF}
              disabled={Object.keys(results).length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 border border-slate-600 py-3 px-4 rounded-2xl text-[10px] font-bold text-slate-200 shadow-sm hover:bg-slate-700 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              PDF SPEC
            </button>
            <button
              onClick={downloadAllCopy}
              disabled={Object.keys(results).length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 border border-slate-600 py-3 px-4 rounded-2xl text-[10px] font-bold text-slate-200 shadow-sm hover:bg-slate-700 transition disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              MARKETING COPY
            </button>
            <button
              onClick={downloadAllImages}
              disabled={Object.keys(results).length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 border border-slate-600 py-3 px-4 rounded-2xl text-[10px] font-bold text-slate-200 shadow-sm hover:bg-slate-700 transition disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              ZIP BUNDLE
            </button>
            <button
              onClick={generateAll}
              disabled={!base64Image || isGenerating}
              className="flex-[2] min-w-[160px] flex items-center justify-center gap-2 bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              GENERATE ALL
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Upload Section */}
            <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-700 space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative block w-full bg-indigo-950/50 border-2 border-dashed border-indigo-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-indigo-900/50 transition overflow-hidden"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-xl shadow-md" />
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-10 h-10 text-indigo-400 mx-auto" />
                    <span className="text-indigo-300 font-bold text-sm block">📸 Upload Product Image</span>
                    <p className="text-[10px] text-indigo-400 uppercase font-bold">JPG, PNG up to 10MB</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleUpload}
                />
              </div>
            </div>

            {/* Product Info Section */}
            <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-700 space-y-4 relative overflow-hidden">
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">AI Analyzing Image...</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Specifications</h3>
                </div>
                <div className="flex items-center gap-2">
                  {isAnalyzing && <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />}
                  <button
                    onClick={() => sheetInputRef.current?.click()}
                    title="Upload spreadsheet (.xlsx or .csv) to auto-fill specs"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-900/50 border border-emerald-700 rounded-lg text-[9px] font-bold text-emerald-400 hover:bg-emerald-800/60 transition"
                  >
                    <Download className="w-3 h-3 rotate-180" />
                    IMPORT SHEET
                  </button>
                  <input
                    type="file"
                    ref={sheetInputRef}
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleSheetUpload}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={productInfo.name}
                    onChange={(e) => { setProductInfo(prev => ({ ...prev, name: e.target.value })); setNameStatus(null); }}
                    className="w-full p-3 pr-28 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition placeholder:text-slate-500"
                  />
                  {nameStatus && (
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${nameStatus === 'original'
                      ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                      : 'bg-amber-900/50 text-amber-400 border border-amber-700'
                      }`}>
                      <ShieldCheck className="w-3 h-3" />
                      {nameStatus === 'original' ? 'AI Verified' : 'AI Revised'}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={productInfo.fixtureType || ""}
                    onChange={(e) => setProductInfo(prev => ({ ...prev, fixtureType: e.target.value }))}
                    className="w-full p-3 pr-10 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition appearance-none"
                  >
                    <option value="" disabled className="text-slate-500">Select Product Type...</option>
                    <option value="Pendant">Pendant</option>
                    <option value="Mini-Pendant">Mini-Pendant</option>
                    <option value="Chandelier">Chandelier</option>
                    <option value="Linear Chandelier">Linear Chandelier</option>
                    <option value="Flush Mount">Flush Mount</option>
                    <option value="Semi-Flush Mount">Semi-Flush Mount</option>
                    <option value="Table Lamp">Table Lamp</option>
                    <option value="Floor Lamp">Floor Lamp</option>
                    <option value="Bath Fixture">Bath Fixture</option>
                    <option value="Wall Sconce">Wall Sconce</option>
                    <option value="Fan Light">Fan Light</option>
                    <option value="Outdoor Wall Fixture">Outdoor Wall Fixture</option>
                    <option value="Outdoor Post">Outdoor Post</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Design Style"
                  value={productInfo.style}
                  onChange={(e) => setProductInfo(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition placeholder:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Dimensions (H x W x D)"
                  value={productInfo.dimensions}
                  onChange={(e) => setProductInfo(prev => ({ ...prev, dimensions: e.target.value }))}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition placeholder:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Bulbs (Num - Type - Wattage with LED Equiv)"
                  value={productInfo.bulbs}
                  onChange={(e) => setProductInfo(prev => ({ ...prev, bulbs: e.target.value }))}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition placeholder:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Hanging Height (MIN - MAX)"
                  value={productInfo.hangingHeight}
                  onChange={(e) => setProductInfo(prev => ({ ...prev, hangingHeight: e.target.value }))}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition placeholder:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="ETL Listing Location"
                  value={productInfo.location}
                  onChange={(e) => setProductInfo(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition placeholder:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Finish Color"
                  value={productInfo.finishColor}
                  onChange={(e) => setProductInfo(prev => ({ ...prev, finishColor: e.target.value }))}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition placeholder:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Shade"
                  value={productInfo.shade}
                  onChange={(e) => setProductInfo(prev => ({ ...prev, shade: e.target.value }))}
                  className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-100 outline-none focus:ring-2 ring-indigo-500/30 transition placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Config Section */}
            <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-700 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staging Parameters</h3>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-2">
                  <span>Intensity</span>
                  <span className="text-indigo-600">{config.intensity}%</span>
                </div>
                <input
                  type="range"
                  min="0" max="100"
                  value={config.intensity}
                  onChange={(e) => setConfig(prev => ({ ...prev, intensity: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-2">
                  <span>Temperature</span>
                  <span className={config.temp.includes('Warm') ? 'text-orange-400' : 'text-blue-400'}>{config.temp}</span>
                </div>
                <input
                  type="range"
                  min="0" max="100"
                  value={config.temp.includes('Warm') ? 20 : 80}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setConfig(prev => ({ ...prev, temp: val < 50 ? "Warm (2700K)" : "Cool (5000K)" }));
                  }}
                  className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${config.temp.includes('Warm') ? 'accent-orange-400' : 'accent-blue-400'}`}
                />
                <div className="temp-gradient mt-2"></div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">Architectural Style</label>
                <select
                  value={config.style}
                  onChange={(e) => setConfig(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full p-4 bg-slate-800 border border-slate-600 rounded-xl font-bold text-indigo-400 outline-none focus:ring-2 ring-indigo-500/30 transition"
                >
                  {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">Custom Details</label>
                <textarea
                  placeholder="Extra details (e.g. Marble floor, grand staircase, sunset lighting)..."
                  value={config.customDetail}
                  onChange={(e) => setConfig(prev => ({ ...prev, customDetail: e.target.value }))}
                  className="w-full p-4 bg-slate-800 border border-slate-600 rounded-xl text-sm text-slate-100 h-28 outline-none focus:ring-2 ring-indigo-500/30 transition resize-none placeholder:text-slate-500"
                ></textarea>
              </div>
            </div>

          </aside>

          {/* Main Content */}
          <main className="lg:col-span-8 space-y-6">
            <AnimatePresence>
              {activeRoom && results[activeRoom] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden border-l-8 border-indigo-400"
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-indigo-300" />
                      <h2 className="text-xl font-black italic tracking-tight uppercase">AI Marketing Narrative: {activeRoom}</h2>
                    </div>
                    <div className="text-sm leading-relaxed text-indigo-100 italic markdown-body">
                      <Markdown>{results[activeRoom].description}</Markdown>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-800 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Social Media Studio */}
            <SocialMediaStudio
              results={results}
              productName={productInfo.name}
              productStyle={productInfo.style}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ROOMS.map((room) => (
                <motion.div
                  key={room}
                  layout
                  onClick={() => !isGenerating && base64Image && handleGenerate(room)}
                  className={`group relative bg-slate-900 border-2 rounded-3xl aspect-square flex flex-col items-center justify-center checkerboard overflow-hidden shadow-sm transition-all cursor-pointer
                    ${results[room] ? 'border-indigo-500' : 'border-slate-700 hover:border-indigo-500'}
                    ${activeRoom === room && isGenerating ? 'ring-4 ring-indigo-500/30' : ''}
                  `}
                >
                  {results[room] ? (
                    <>
                      <img
                        src={results[room].imageUrl}
                        alt={room}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          RE-GENERATE
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCoverRoom(room); }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all ${coverRoom === room
                            ? 'bg-amber-400 text-amber-900'
                            : 'bg-white/80 text-slate-600 hover:bg-amber-100'
                            }`}
                        >
                          <Star className={`w-3 h-3 ${coverRoom === room ? 'fill-amber-900' : ''}`} />
                          {coverRoom === room ? 'COVER IMAGE' : 'USE AS COVER'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = results[room].imageUrl;
                            link.download = `${productInfo.name || 'VizionIt'}-${room.toLowerCase().replace(/\s+/g, '-')}-300ppi.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 hover:bg-emerald-500 transition-all shadow-sm"
                        >
                          <Download className="w-3 h-3" />
                          DOWNLOAD HI-RES
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const clean = (results[room].description || "")
                              .replace(/#{1,6}\s+/g, "")
                              .replace(/\*\*/g, "")
                              .replace(/\*/g, "")
                              .replace(/calibrated/gi, "")
                              .replace(/light source/gi, "illumination")
                              .replace(/\d+K/gi, "")
                              .replace(/at \d+%\s*intensity/gi, "")
                              .replace(/intensity/gi, "glow")
                              .replace(/precisely/gi, "")
                              .trim();
                            navigator.clipboard.writeText(clean).catch(() => {
                              const ta = document.createElement('textarea');
                              ta.value = clean;
                              document.body.appendChild(ta);
                              ta.select();
                              document.execCommand('copy');
                              document.body.removeChild(ta);
                            });
                          }}
                          className="bg-violet-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 hover:bg-violet-500 transition-all shadow-sm"
                        >
                          <FileText className="w-3 h-3" />
                          COPY TEXT
                        </button>
                      </div>
                      {coverRoom === room && (
                        <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 px-2 py-1 rounded-lg text-[8px] font-black flex items-center gap-1 shadow-lg">
                          <Star className="w-2.5 h-2.5 fill-amber-900" />
                          COVER
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      {activeRoom === room && isGenerating ? (
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-200 group-hover:text-indigo-200 transition-colors" />
                      )}
                      <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-300 uppercase tracking-widest transition-colors">
                        {room}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-0 w-full bg-slate-900/90 py-1.5 text-center text-[8px] font-black text-slate-300 border-t border-slate-700 opacity-0 group-hover:opacity-100 transition-all transform translate-y-full group-hover:translate-y-0">
                    300 PPI STAGING
                  </div>

                  {results[room] && (
                    <div className="absolute top-3 right-3 bg-indigo-600 text-white p-1.5 rounded-lg shadow-lg">
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
