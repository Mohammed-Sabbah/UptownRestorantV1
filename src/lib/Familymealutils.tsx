/**
 * Utility for rendering family meal addon_details (JSON format)
 * Used in: success page, order-status page, admin, email
 */

export type BurgerItem = {
    index: number;
    typeAr: string;
    typeEn: string;
    addons: { nameAr: string; nameEn: string; price: number }[];
    without: { nameAr: string; nameEn: string }[];
};

export type FamilyMealPayload = {
    type: 'family_meal';
    burgers: BurgerItem[];
    note?: string;
};

/**
 * Parse addon_details — returns FamilyMealPayload if family meal, null otherwise
 */
export function parseFamilyMeal(addonDetails: string): FamilyMealPayload | null {
    if (!addonDetails) return null;
    try {
        const parsed = JSON.parse(addonDetails);
        if (parsed?.type === 'family_meal') return parsed as FamilyMealPayload;
    } catch (_) { }
    return null;
}

/**
 * React component — renders family meal burgers list
 */
export function FamilyMealDetails({ addonDetails, isAr = true }: { addonDetails: string; isAr?: boolean }) {
    const data = parseFamilyMeal(addonDetails);
    if (!data) return null;

    return (
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
            {data.burgers.map((burger, idx) => {
                const typeName = isAr ? burger.typeAr : burger.typeEn;
                const hasAddons = burger.addons.length > 0;
                const hasWithout = burger.without.length > 0;

                return (
                    <div key={idx} style={{
                        borderBottom: idx < data.burgers.length - 1 ? '1px dashed #eee' : 'none',
                        paddingBottom: '8px',
                        marginBottom: '8px',
                    }}>
                        {/* اسم البرغر والنوع */}
                        <div>
                            <span style={{ fontWeight: 900, color: '#8B0000' }}>
                                🍔 {isAr ? `بيرجر ${burger.index}` : `Burger ${burger.index}`}:
                            </span>
                            {typeName && (
                                <span style={{ fontWeight: 700, color: '#333', marginRight: '6px', marginLeft: '6px' }}>
                                    {typeName}
                                </span>
                            )}
                        </div>

                        {/* الإضافات */}
                        {hasAddons && (
                            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {burger.addons.map((addon, aIdx) => (
                                    <span key={aIdx} style={{
                                        display: 'inline-block',
                                        background: '#dcfce7',
                                        color: '#166534',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '11px',
                                    }}>
                                        ➕ {isAr ? addon.nameAr : addon.nameEn}
                                        {addon.price > 0 ? ` (+${addon.price}₪)` : ''}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* البدون */}
                        {hasWithout && (
                            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {burger.without.map((w, wIdx) => (
                                    <span key={wIdx} style={{
                                        display: 'inline-block',
                                        background: '#fee2e2',
                                        color: '#b91c1c',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '11px',
                                    }}>
                                        🚫 {isAr ? w.nameAr : w.nameEn}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* الملاحظة */}
            {data.note && (
                <div style={{ color: '#888', fontStyle: 'italic', marginTop: '6px', fontSize: '11px' }}>
                    📝 {data.note}
                </div>
            )}
        </div>
    );
}

/**
 * HTML string version — for emails (no React)
 */
export function familyMealToHtml(addonDetails: string, isAr = true): string {
    const data = parseFamilyMeal(addonDetails);
    if (!data) return '';

    const rows = data.burgers.map(burger => {
        const typeName = isAr ? burger.typeAr : burger.typeEn;
        const addonsHtml = burger.addons.map(a =>
            `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px;margin:2px;display:inline-block;">➕ ${isAr ? a.nameAr : a.nameEn}${a.price > 0 ? ` (+${a.price}₪)` : ''}</span>`
        ).join('');
        const withoutHtml = burger.without.map(w =>
            `<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px;margin:2px;display:inline-block;">🚫 ${isAr ? w.nameAr : w.nameEn}</span>`
        ).join('');

        return `
      <div style="padding:6px 0;border-bottom:1px dashed #eee;">
        <div>
          <span style="font-weight:900;color:#8B0000;">🍔 ${isAr ? `بيرجر ${burger.index}` : `Burger ${burger.index}`}:</span>
          ${typeName ? `<span style="font-weight:700;color:#333;margin:0 6px;">${typeName}</span>` : ''}
        </div>
        ${addonsHtml ? `<div style="margin-top:4px;">${addonsHtml}</div>` : ''}
        ${withoutHtml ? `<div style="margin-top:4px;">${withoutHtml}</div>` : ''}
      </div>`;
    }).join('');

    const noteHtml = data.note
        ? `<div style="color:#888;font-style:italic;margin-top:6px;font-size:11px;">📝 ${data.note}</div>`
        : '';

    return `<div style="margin-top:8px;padding:10px;background:#fff8f8;border-radius:8px;border:1px solid #ffe4e4;">${rows}${noteHtml}</div>`;
}