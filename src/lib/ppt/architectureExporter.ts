import pptxgen from 'pptxgenjs';
import { ArchitectureSlideModel } from '../architecture/types';

function colorForToken(slide: ArchitectureSlideModel, token: string): string {
  switch (token) {
    case 'wrtn':
      return slide.styleProfile.wrtnFillColor.replace('#', '');
    case 'shared':
      return slide.styleProfile.sharedFillColor.replace('#', '');
    case 'analytics':
      return slide.styleProfile.groupFillColor.replace('#', '');
    default:
      return slide.styleProfile.customerFillColor.replace('#', '');
  }
}

function toInchX(x: number): number {
  return (x / 100) * 13.333;
}

function toInchY(y: number): number {
  return (y / 100) * 7.5;
}

function toInchW(w: number): number {
  return (w / 100) * 13.333;
}

function toInchH(h: number): number {
  return (h / 100) * 7.5;
}

export async function exportArchitectureSlide(slideModel: ArchitectureSlideModel): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'PPT Agent';
  pptx.subject = slideModel.title;
  pptx.title = slideModel.title;
  pptx.company = 'Wrtn';

  const slide = pptx.addSlide();
  slide.background = { color: slideModel.styleProfile.backgroundColor.replace('#', '') };

  slide.addText(slideModel.title, {
    x: 0.35, y: 0.2, w: 10.8, h: 0.5,
    fontFace: 'Arial',
    fontSize: 24,
    bold: true,
    color: slideModel.styleProfile.titleColor.replace('#', ''),
  });

  if (slideModel.subtitle) {
    slide.addText(slideModel.subtitle, {
      x: 0.35, y: 0.8, w: 11.8, h: 0.35,
      fontFace: 'Arial',
      fontSize: 11,
      color: slideModel.styleProfile.subtitleColor.replace('#', ''),
    });
  }

  slideModel.groups.forEach((group) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: toInchX(group.x),
      y: toInchY(group.y),
      w: toInchW(group.w),
      h: toInchH(group.h),
      line: { color: slideModel.styleProfile.groupStrokeColor.replace('#', ''), width: 1.2 },
      fill: { color: slideModel.styleProfile.groupFillColor.replace('#', ''), transparency: 15 },
    });
    slide.addText(group.title, {
      x: toInchX(group.x) + 0.1,
      y: toInchY(group.y) + 0.05,
      w: toInchW(group.w) - 0.2,
      h: 0.2,
      bold: true,
      fontSize: 11,
      color: slideModel.styleProfile.titleColor.replace('#', ''),
    });
  });

  slideModel.components.forEach((component) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: toInchX(component.x),
      y: toInchY(component.y),
      w: toInchW(component.w),
      h: toInchH(component.h),
      line: { color: slideModel.styleProfile.groupStrokeColor.replace('#', ''), width: 0.8 },
      fill: { color: colorForToken(slideModel, component.colorToken) },
    });
    slide.addText(component.label, {
      x: toInchX(component.x) + 0.06,
      y: toInchY(component.y) + 0.07,
      w: toInchW(component.w) - 0.12,
      h: toInchH(component.h) - 0.14,
      fontSize: 9,
      bold: component.colorToken === 'wrtn',
      align: 'center',
      valign: 'middle',
      color: '1f2937',
      margin: 0.04,
    });
  });

  slideModel.connections.forEach((connection) => {
    for (let index = 0; index < connection.points.length - 1; index++) {
      const from = connection.points[index];
      const to = connection.points[index + 1];
      slide.addShape(pptx.ShapeType.line, {
        x: toInchX(from.x),
        y: toInchY(from.y),
        w: toInchX(to.x) - toInchX(from.x),
        h: toInchY(to.y) - toInchY(from.y),
        line: {
          color: slideModel.styleProfile.connectionColor.replace('#', ''),
          width: 1,
          beginArrowType: 'none',
          endArrowType: index === connection.points.length - 2 ? 'triangle' : 'none',
        },
      });
    }
  });

  if (slideModel.legend && slideModel.legend.length > 0) {
    slideModel.legend.forEach((legend, index) => {
      const x = 11.0;
      const y = 0.2 + index * 0.22;
      slide.addShape(pptx.ShapeType.ellipse, {
        x,
        y,
        w: 0.12,
        h: 0.12,
        line: { color: colorForToken(slideModel, legend.colorToken), width: 0.5 },
        fill: { color: colorForToken(slideModel, legend.colorToken) },
      });
      slide.addText(legend.label, {
        x: x + 0.16,
        y: y - 0.02,
        w: 1.6,
        h: 0.18,
        fontSize: 8,
        color: slideModel.styleProfile.subtitleColor.replace('#', ''),
      });
    });
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  if (Buffer.isBuffer(buffer)) return buffer;
  if (buffer instanceof Uint8Array) return Buffer.from(buffer);
  if (buffer instanceof ArrayBuffer) return Buffer.from(new Uint8Array(buffer));
  return Buffer.from(String(buffer));
}
