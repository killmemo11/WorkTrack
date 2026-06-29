// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const unitsMasculine = ['', 'واحد', 'اثنان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع'];
const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

const thousands = ['', 'ألف', 'ألفان', 'آلاف'];
const millions = ['', 'مليون', 'مليونان', 'ملايين'];
const billions = ['', 'مليار', 'ملياران', 'مليارات'];

function threeDigits(n, feminine) {
  const u = feminine ? unitsMasculine : units;
  let result = '';

  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const uu = n % 10;

  if (h > 0) {
    if (h === 1) result += 'مائة';
    else if (h === 2) result += 'مائتان';
    else result += hundreds[h];
  }

  if (t === 0 && uu === 0) return result || 'صفر';

  if (t === 0) {
    if (uu === 2 && !result) return 'اثنان';
    if (result && uu === 2) return result + ' و' + u[2].replace('اثنان', 'اثنين');
    if (uu === 1) {
      if (!result) return 'واحد';
      return result + ' و' + u[1];
    }
    if (uu === 2) {
      if (!result) return 'اثنان';
      return result + ' واثنين';
    }
    if (!result) return u[uu];
    return result + ' و' + u[uu];
  }

  if (t === 1) {
    const teen = 10 + uu;
    const teens = {
      10: 'عشرة', 11: 'أحد عشر', 12: 'اثنا عشر', 13: 'ثلاثة عشر',
      14: 'أربعة عشر', 15: 'خمسة عشر', 16: 'ستة عشر', 17: 'سبعة عشر',
      18: 'ثمانية عشر', 19: 'تسعة عشر',
    };
    const teenStr = feminine ? teens[teen].replace('ثلاثة', 'ثلاث').replace('أربعة', 'أربع').replace('خمسة', 'خمس').replace('ستة', 'ست').replace('سبعة', 'سبع').replace('ثمانية', 'ثمان').replace('تسعة', 'تسع') : teens[teen];
    if (!result) return teenStr;
    return result + ' و' + teenStr;
  }

  if (uu === 0) {
    if (!result) return tens[t];
    return result + ' و' + tens[t];
  }

  if (uu === 1) {
    if (!result) return u[1] + ' ' + tens[t];
    return result + ' ' + u[1] + ' و' + tens[t];
  }

  if (uu === 2) {
    if (!result) return 'اثنان ' + tens[t];
    return result + ' واثنان ' + tens[t];
  }

  if (!result) return u[uu] + ' و' + tens[t];
  return result + ' و' + u[uu] + ' و' + tens[t];
}

function arabicNumberToWords(num) {
  if (num === 0) return 'صفر';
  if (typeof num === 'string') num = parseFloat(num.replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return '';
  if (num < 0) return 'ناقص ' + arabicNumberToWords(Math.abs(num));

  const parts = [];

  const billionsPart = Math.floor(num / 1000000000);
  const millionsPart = Math.floor((num % 1000000000) / 1000000);
  const thousandsPart = Math.floor((num % 1000000) / 1000);
  const remainder = Math.floor(num % 1000);

  if (billionsPart > 0) {
    if (billionsPart === 1) parts.push('مليار');
    else if (billionsPart === 2) parts.push('ملياران');
    else {
      const word = threeDigits(billionsPart, false);
      if (billionsPart >= 3 && billionsPart <= 10) parts.push(word + ' مليارات');
      else parts.push(word + ' مليار');
    }
  }

  if (millionsPart > 0) {
    if (millionsPart === 1) parts.push('مليون');
    else if (millionsPart === 2) parts.push('مليونان');
    else {
      const word = threeDigits(millionsPart, false);
      if (millionsPart >= 3 && millionsPart <= 10) parts.push(word + ' ملايين');
      else parts.push(word + ' مليون');
    }
  }

  if (thousandsPart > 0) {
    if (thousandsPart === 1) parts.push('ألف');
    else if (thousandsPart === 2) parts.push('ألفان');
    else {
      const word = threeDigits(thousandsPart, false);
      if (thousandsPart >= 3 && thousandsPart <= 10) parts.push(word + ' آلاف');
      else parts.push(word + ' ألف');
    }
  }

  if (remainder > 0) {
    const word = threeDigits(remainder, false);
    parts.push(word);
  }

  return parts.join(' و ');
}

function formatSalaryBreakdown(components) {
  if (!components || components.length === 0) return '';

  let total = 0;
  const rows = components.map(c => {
    const amt = parseFloat(c.amount) || 0;
    total += amt;
    return `<tr><td style="text-align:right;padding:4px 8px;border:1px solid #333;">${c.component_name}</td><td style="text-align:left;padding:4px 8px;border:1px solid #333;">${amt.toFixed(2)}</td></tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:collapse;margin:10px 0;">
    <thead><tr style="background:#f5f5f5;"><th style="text-align:right;padding:6px 8px;border:1px solid #333;">البيان</th><th style="text-align:left;padding:6px 8px;border:1px solid #333;">القيمة</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:#e8f4e8;font-weight:bold;"><td style="text-align:right;padding:6px 8px;border:1px solid #333;">الإجمالي</td><td style="text-align:left;padding:6px 8px;border:1px solid #333;">${total.toFixed(2)}</td></tr></tfoot>
  </table>`;
}

function getTotalSalary(components) {
  if (!components || components.length === 0) return 0;
  return components.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
}

module.exports = { arabicNumberToWords, formatSalaryBreakdown, getTotalSalary };
