// ===== UI Module =====
var UI = window.UI || {
    showModal(overlayId, panelId) {
        const overlay = document.getElementById(overlayId);
        const panel = document.getElementById(panelId);
        if (overlay) overlay.style.display = 'block';
        if (panel) {
            panel.style.display = 'flex';
            setTimeout(() => panel.classList.add('is-active'), 10);
        }
        document.body.style.overflow = 'hidden';
    },

    hideModal(overlayId, panelId) {
        const overlay = document.getElementById(overlayId);
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.remove('is-active');
        if (overlay) overlay.style.display = 'none';
        setTimeout(() => {
            if (panel) panel.style.display = 'none';
        }, 400);
        document.body.style.overflow = '';
    },

    updateCartBadge(branchSlug) {
        if (typeof Cart === 'undefined') return;
        const count = Cart.getCount(branchSlug);
        const btn = document.getElementById('cart-btn');
        const badge = document.getElementById('cart-badge');

        if (btn) {
            btn.style.display = 'flex';
            // Trigger pulse animation
            btn.classList.add('cart-pulse');
            setTimeout(() => btn.classList.remove('cart-pulse'), 500);
        }

        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        } else if (btn && count > 0 && !document.getElementById('cart-badge')) {
            // If badge was missing (e.g. innerHTML overwrite), standard updateBadge in page.tsx will catch it
            // but we can force a re-render of the inner button if needed.
        }
    },

    renderCartModal(branchSlug, currency) {
        const items = Cart.getItems(branchSlug);
        const total = Cart.getTotal(branchSlug);
        const panel = document.getElementById('cart-modal');
        const isAr = Lang.current === 'ar';

        if (items.length === 0) {
            panel.innerHTML = `
                <div class="modal-header premium-cart-header">
                    <span class="modal-title">${Lang.t('cart')}</span>
                    <button class="modal-close" onclick="UI.hideModal('cart-modal-overlay','cart-modal')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="modal-body cart-empty-premium">
                    <div class="cart-empty-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ECEAE7" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    </div>
                    <h4>${isAr ? 'حقيبتك فارغة' : 'Your Bag is Empty'}</h4>
                    <p>${Lang.t('emptyCart')}</p>
                    <button class="uptown-btn-outline mt-6" onclick="UI.hideModal('cart-modal-overlay','cart-modal')">${isAr ? 'ابدأ التسوق' : 'Start Shopping'}</button>
                </div>`;
            return;
        }

        const itemsHtml = items.map(item => {
            const itemName = Lang.localized(item.nameAr, item.nameEn);
            const itemPrice = (item.finalPrice * item.quantity).toFixed(0);
            return `
                <div class="cart-item-premium">
                    <div class="cart-item-img-box">
                        <img src="${item.imagePath || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200'}" alt="${itemName}">
                    </div>
                    <div class="cart-item-content">
                        <div class="cart-item-top">
                            <span class="cart-item-name">${itemName}</span>
                            <button class="cart-item-remove" onclick="Cart.removeItem('${branchSlug}','${item.id}');UI.renderCartModal('${branchSlug}','${currency}');UI.updateCartBadge('${branchSlug}');">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <div class="cart-item-meta">
                            ${item.selectedSize ? `<span class="badge-mini">${Lang.localized(item.selectedSize.nameAr, item.selectedSize.nameEn)}</span>` : ''}
                            ${item.selectedType ? `<span class="badge-mini">${Lang.localized(item.selectedType.nameAr, item.selectedType.nameEn)}</span>` : ''}
                            ${item.selectedAddOns && item.selectedAddOns.length > 0 ? (() => {
                    const addons = item.selectedAddOns.filter(a => !((a.nameAr || '').includes('بدون') || (a.nameEn || '').toLowerCase().includes('without') || (a.nameEn || '').toLowerCase().includes('no ')));
                    const notes = item.selectedAddOns.filter(a => ((a.nameAr || '').includes('بدون') || (a.nameEn || '').toLowerCase().includes('without') || (a.nameEn || '').toLowerCase().includes('no ')));

                    let metaHtml = '';
                    if (addons.length > 0) {
                        metaHtml += addons.map(a => `<span class="badge-mini">${Lang.localized(a.nameAr, a.nameEn)}</span>`).join('');
                    }
                    if (notes.length > 0) {
                        metaHtml += notes.map(a => `<span class="badge-mini" style="background: #fff; color: #dc2626; border: 1px solid #dc2626; font-weight: bold;">🚫 ${Lang.localized(a.nameAr, a.nameEn)}</span>`).join('');
                    }
                    return metaHtml;
                })() : ''}
                        </div>
                        <div class="cart-item-footer">
                            <div class="cart-qty-control">
                                <button onclick="Cart.setQuantity('${branchSlug}','${item.id}', ${item.quantity - 1});UI.renderCartModal('${branchSlug}','${currency}');UI.updateCartBadge('${branchSlug}');">−</button>
                                <span>${item.quantity}</span>
                                <button onclick="Cart.setQuantity('${branchSlug}','${item.id}', ${item.quantity + 1});UI.renderCartModal('${branchSlug}','${currency}');UI.updateCartBadge('${branchSlug}');">+</button>
                            </div>
                            <span class="cart-item-price-premium">${itemPrice} ${currency}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        panel.innerHTML = `
            <div class="modal-header premium-cart-header">
                <span class="modal-title">${Lang.t('cart')} (${items.length})</span>
                <button class="modal-close" onclick="UI.hideModal('cart-modal-overlay','cart-modal')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="modal-body side-modal-body">
                <div class="cart-items-wrapper">
                    ${itemsHtml}
                </div>
                <div class="cart-summary-premium">
                    <div class="summary-line">
                        <span>${isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                        <span>${total.toFixed(0)} ${currency}</span>
                    </div>
                    <div class="summary-line grand-total">
                        <span>${Lang.t('total')}</span>
                        <span>${total.toFixed(0)} ${currency}</span>
                    </div>
                    <button class="uptown-checkout-btn" onclick="UI.hideModal('cart-modal-overlay','cart-modal');window.location.href='/checkout/${branchSlug}';">
                        ${Lang.t('checkout')}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-inline-start:10px"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>`;
    },

    renderProductModal(product, addonGroups, branchSlug, currency, branchDiscount, branchId) {
        const panel = document.getElementById('product-modal');
        let state = {
            quantity: 1,
            selectedSize: product.sizes?.length ? product.sizes[0] : null,
            selectedType: null, // Will be set below
            selectedAddOns: [],
            selectedSimpleAddons: [], // إضافات بسيطة مباشرة على المنتج
            note: ''
        };

        // Default to 'Sandwich' (ساندويش) if possible
        if (product.types?.length) {
            const sandwichType = product.types.find(t => (t.nameAr || '').includes('ساندويش') || (t.nameAr || '').includes('سندويش') || (t.nameEn || '').toLowerCase().includes('sandwich'));
            state.selectedType = sandwichType || product.types[0];
        }

        const typeGroup = addonGroups.find(g => (g.groupType === 'type' || g.groupType === 'types' || (g.nameAr || '').includes('النوع')));
        if (typeGroup && typeGroup.items.length) {
            const sandwichItem = typeGroup.items.find(it => (it.nameAr || '').includes('ساندويش') || (it.nameAr || '').includes('سندويش') || (it.nameEn || '').toLowerCase().includes('sandwich'));
            state.selectedAddOns.push(sandwichItem || typeGroup.items[0]);
        }

        const hasCombinedSizeAndType = !!product.sizes?.length && !!product.types?.length;

        const getSelectedIds = () => new Set(state.selectedAddOns.map(item => item.id));
        const isMealSelection = () => {
            // 1. Check if a "Product Type" containing 'Meal' is selected
            const type = state.selectedType;
            if (type) {
                const text = `${type.nameAr || ''} ${type.nameEn || ''}`.toLowerCase();
                if (text.includes('meal') || text.includes('وجبة')) return true;
                if (text.includes('sandwich') || text.includes('ساندويش') || text.includes('سندويش')) return false;
                if (text.includes('burger') || text.includes('بيرجر') || text.includes('برجر')) return false; // ← هاد الجديد
            }

            // 2. Check if an "Addon Group" of type 'type' has a 'Meal' item selected
            const typeAddon = state.selectedAddOns.find(item => {
                const group = findGroupByItemId(item.id);
                return group && (group.groupType === 'type' || (group.nameAr || '').includes('النوع'));
            });
            if (typeAddon) {
                const text = `${typeAddon.nameAr || ''} ${typeAddon.nameEn || ''}`.toLowerCase();
                if (text.includes('meal') || text.includes('وجبة')) return true;
                if (text.includes('sandwich') || text.includes('ساندويش') || text.includes('سندويش')) return false;
                if (text.includes('burger') || text.includes('بيرجر') || text.includes('برجر')) return false; // ← هاد الجديد
            }

            const hasTypeGroupWithSandwich = addonGroups.some(g =>
                ((g.groupType === 'type' || (g.nameAr || '').includes('النوع'))) &&
                g.items.some(it => (it.nameAr || '').includes('ساندويش') || (it.nameAr || '').includes('سندويش'))
            ) || (product.types || []).some(t => (t.nameAr || '').includes('ساندويش') || (t.nameAr || '').includes('سندويش'));

            if (hasTypeGroupWithSandwich) return false;

            const hasTypeGroup = addonGroups.some(g =>
                g.groupType === 'type' || (g.nameAr || '').includes('النوع')
            );
            if (hasTypeGroup) return false;

            return !!product.hasMealOption;
        };

        const findGroupByItemId = (itemId) => addonGroups.find(group => group.items.some(item => item.id === itemId));

        const getVisibleGroups = () => {
            const isBurgerOrSandwich = [2, 3, "2", "3"].includes(product.categoryId);

            const filtered = (addonGroups || []).filter(group => {
                const nameEn = (group.nameEn || '').toLowerCase();
                const nameAr = (group.nameAr || '').toLowerCase();
                const type = group.groupType;
                const name = (group.nameAr || '') + ' ' + (group.nameEn || '');

                const isSizeGroup = (type === 'Size' || type === 'sizes' || name.includes('الحجم') || name.toLowerCase().includes('size'));
                if (isSizeGroup && product.id !== 87 && isBurgerOrSandwich) return false;

                const isDrinkOrFries =
                    ['choose drink', 'change drink', 'change fries', 'upgrade drink', 'upgrade fries', 'select drink', 'swap drink', 'swap fries'].some(t => nameEn.includes(t)) ||
                    ['اختيار المشروب', 'تبديل المشروب', 'تبديل البطاطا'].some(t => nameAr.includes(t));

                if (isDrinkOrFries && isBurgerOrSandwich) return isMealSelection();

                const isMealSpecificGroup = ['MealDrink', 'MealDrinkUpgrade', 'MealFries'].includes(type);
                if (isMealSpecificGroup && isBurgerOrSandwich) return isMealSelection();

                if (type === 'Doneness' || name.includes('الاستواء')) return !!product.hasDonenessOption;

                return true;
            });

            return filtered.sort((a, b) => {
                const nameA = (a.nameAr || '').toLowerCase();
                const nameB = (b.nameAr || '').toLowerCase();
                const type = (t) => (t.groupType || '').toLowerCase();

                const priority = (group) => {
                    const name = (group.nameAr || '').toLowerCase();
                    const t = (group.groupType || '').toLowerCase();

                    if (t === 'type') return 1;                                          // النوع
                    if (t === 'addon' || name.includes('إضاف')) return 2;               // الإضافات

                    // لما يكون المستخدم اختار وجبة: بدون قبل المشروب
                    const selectedTypeName = (state.selectedType?.nameAr || state.selectedType?.nameEn || '').toLowerCase();
                    const isMealSelected = selectedTypeName.includes('وجبة') || selectedTypeName.includes('meal');

                    if (isMealSelected) {
                        if (t === 'without' || name.includes('بدون')) return 3;         // بدون
                        if (t === 'mealdrink') return 4;                                // اختيار المشروب
                        if (t === 'mealdrinupgrade' || t === 'mealdrinkupgrade') return 5; // تبديل المشروب
                        if (t === 'mealfries') return 6;                               // تبديل البطاطا
                    } else {
                        if (t === 'mealdrinupgrade' || t === 'mealdrink') return 3;
                        if (t === 'mealfries') return 4;
                        if (t === 'without' || name.includes('بدون')) return 5;
                    }
                    return 10;
                };

                const pA = priority(a);
                const pB = priority(b);
                if (pA !== pB) return pA - pB;
                return (a.sortOrder || 0) - (b.sortOrder || 0);
            });
        };

        const syncVisibleSelections = () => {
            const visibleGroups = getVisibleGroups();
            const visibleGroupIds = new Set(visibleGroups.map(group => group.id));

            // Disable purging to prevent disappearance of groups when categories fluctuate
            /*
            state.selectedAddOns = state.selectedAddOns.filter(item => {
                const group = findGroupByItemId(item.id);
                return group && visibleGroupIds.has(group.id);
            });
            */

            visibleGroups.forEach(group => {
                const isRequiredSingle = group.isRequired && !group.allowMultiple && group.items.length;
                if (!isRequiredSingle) return;

                const hasSelection = state.selectedAddOns.some(item => group.items.some(groupItem => groupItem.id === item.id));
                if (!hasSelection) {
                    const firstItem = group.items[0];
                    if (Number(firstItem.price || 0) === 0) {
                        state.selectedAddOns.push(firstItem);
                    }
                }
            });

            // Auto-select first item ONLY IF price is 0 (Regular Fries/Drink)
            if (isMealSelection()) {
                visibleGroups.forEach(group => {
                    if (['MealDrink', 'MealFries'].includes(group.groupType)) {
                        const hasSelection = state.selectedAddOns.some(item => group.items.some(gi => gi.id === item.id));
                        if (!hasSelection && group.items.length) {
                            const firstItem = group.items[0];
                            if (Number(firstItem.price || 0) === 0) {
                                state.selectedAddOns.push(firstItem);
                            }
                        }
                    }
                });
            }
        };


        const calculateBasePrice = () => {
            if (state.selectedSize && hasCombinedSizeAndType) {
                return state.selectedSize.price + (state.selectedType?.price || 0);
            }
            if (state.selectedSize) return state.selectedSize.price;
            if (state.selectedType) return state.selectedType.price;
            return product.basePrice || 0;
        };

        const calculateUnitPrice = () => {
            const addonsPrice = state.selectedAddOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
            const simpleAddonsPrice = state.selectedSimpleAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
            let unitPrice = calculateBasePrice() + addonsPrice + simpleAddonsPrice;

            // خصم حسب الفرع
            const bDiscounts = product.branchDiscounts || product.branch_discounts || {};
            let effectiveDiscount = branchDiscount;
            if (branchId !== undefined && bDiscounts[branchId] !== undefined) {
                effectiveDiscount = Number(bDiscounts[branchId]);
            }

            if (product.discount > 0) unitPrice = unitPrice - (unitPrice * product.discount / 100);
            if (effectiveDiscount > 0) unitPrice = unitPrice - (unitPrice * effectiveDiscount / 100);

            return unitPrice;
        };

        const validateRequiredGroups = () => {
            const missingGroups = getVisibleGroups().filter(group => {
                if (!group.isRequired) return false;
                return !state.selectedAddOns.some(item => group.items.some(groupItem => groupItem.id === item.id));
            });

            if (!missingGroups.length) return true;

            const missingLabel = Lang.localized(missingGroups[0].nameAr, missingGroups[0].nameEn);
            alert(`${Lang.t('required')}: ${missingLabel}`);
            return false;
        };

        const toggleAddon = (group, item) => {
            const currentlySelected = state.selectedAddOns.find(addon => addon.id === item.id);

            if (group.allowMultiple) {
                if (currentlySelected) {
                    // Deselect
                    state.selectedAddOns = state.selectedAddOns.filter(addon => addon.id !== item.id);
                } else {
                    // Check max selections
                    const maxSel = group.maxSelections || 0;
                    if (maxSel > 0) {
                        const currentCount = state.selectedAddOns.filter(a => {
                            const g = findGroupByItemId(a.id);
                            return g && g.id === group.id;
                        }).length;
                        if (currentCount >= maxSel) {
                            const isAr = typeof Lang !== 'undefined' ? Lang.current === 'ar' : true;
                            alert(isAr
                                ? `الحد الأقصى لهذا الخيار: ${maxSel} إضافة فقط.`
                                : `Maximum ${maxSel} selection(s) allowed for this option.`);
                            return;
                        }
                    }
                    state.selectedAddOns.push({ ...item, groupType: group.groupType, groupNameAr: group.nameAr, groupNameEn: group.nameEn });

                }
            } else {
                if (currentlySelected) {
                    // If already selected, clicking it again should DESELECT it (flexible behavior)
                    state.selectedAddOns = state.selectedAddOns.filter(addon => addon.id !== item.id);
                } else {
                    // Remove any other item from the SAME group (radio behavior)
                    state.selectedAddOns = state.selectedAddOns.filter(a => {
                        const g = findGroupByItemId(a.id);
                        return !g || g.id !== group.id;
                    });
                    state.selectedAddOns.push({ ...item, groupType: group.groupType, groupNameAr: group.nameAr, groupNameEn: group.nameEn });

                }
            }
        };

        const renderGroup = (group, selectedIds) => {
            const groupLabel = Lang.localized(group.nameAr, group.nameEn);
            const reqBadge = group.isRequired ? `<span class="required-badge">(${Lang.t('required')})</span>` : '';
            const maxBadge = group.allowMultiple && group.maxSelections > 0
                ? `<span style="font-size:11px;background:#f0f0f0;color:#555;padding:2px 8px;border-radius:20px;margin-inline-start:8px;font-weight:700">اختر حتى ${group.maxSelections}</span>`
                : '';

            return `
                <div class="option-group">
                    <div class="option-group-title">${groupLabel} ${reqBadge}${maxBadge}</div>
                    <div class="option-stack">
                        ${group.items.map(item => {
                const isSelected = selectedIds.has(item.id);
                const itemNameAr = item.nameAr || '';
                const itemNameEn = item.nameEn || '';
                const isNote = itemNameAr.includes('بدون') || itemNameEn.toLowerCase().includes('without') || itemNameEn.toLowerCase().includes('no ');

                const selectorClass = group.allowMultiple ? 'option-item-check' : 'option-item-radio';
                const priceLabel = item.price > 0 ? `+${item.price}${currency}` : '';

                return `
                                <div class="option-item ${isSelected ? 'selected' : ''} ${isNote ? 'is-note-option' : ''}" data-action="addon" data-group-id="${group.id}" data-id="${item.id}" style="${isNote ? 'border-color: #fca5a5; background: #fff5f5;' : ''}">
                                    <div class="option-item-label">
                                        <div class="${selectorClass}"></div>
                                        <span class="option-item-name" style="${isNote ? 'color: #dc2626; font-weight: 800;' : ''}">${isNote ? '❌ ' : ''}${Lang.localized(itemNameAr, itemNameEn)}</span>
                                    </div>
                                    ${priceLabel ? `<span class="option-item-price">${priceLabel}</span>` : ''}
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        };

        const render = () => {
            const body = panel.querySelector('.modal-body');
            const scrollPos = body ? body.scrollTop : 0;

            syncVisibleSelections();

            const selectedIds = getSelectedIds();
            const visibleGroups = getVisibleGroups();
            const totalPrice = calculateUnitPrice() * state.quantity;

            let html = `
                <div class="modal-header">
                    <button class="modal-close" onclick="UI.hideModal('product-modal-overlay','product-modal')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <span class="modal-title" style="font-size:1.2rem">${Lang.localized(product.nameAr, product.nameEn)}</span>
                </div>
                <div class="modal-body">
                    <div class="product-modal-image-wrap">
                        <img src="${product.imagePath || '/images/classic-cheeseburger__0x1e3y1qv68eiip.jpg'}" class="product-modal-image" alt="${product.nameEn}" />
                    </div>
            `;

            const desc = Lang.localized(product.descriptionAr, product.descriptionEn);
            if (desc) {
                html += `<div class="product-modal-desc">${desc}</div>`;
            }

            const hasSizeGroup = getVisibleGroups().some(g => g.groupType === 'Size' || g.groupType === 'sizes' || g.nameAr?.includes('الحجم') || g.nameEn?.toLowerCase().includes('size'));
            const showSizePills = product.sizes?.length && !hasSizeGroup && (product.id === 87 || ![1, 2].includes(product.categoryId));

            if (showSizePills) {
                html += `
                    <div class="option-group">
                        <div class="option-group-title" style="font-size:15px">${Lang.t('size')}</div>
                        <div class="option-stack">
                            ${product.sizes.map(size => {
                    const priceText = size.price > 0 ? `${size.price}${currency}` : `${product.basePrice || 0}${currency}`;
                    return `
                                <div class="option-item ${state.selectedSize?.id === size.id ? 'selected' : ''}" data-action="size" data-id="${size.id}" style="padding:10px 15px">
                                    <span class="option-item-price">${priceText}</span>
                                    <div class="option-item-label">
                                        <span class="option-item-name" style="font-size:14px">${Lang.localized(size.nameAr, size.nameEn)}</span>
                                        <div class="option-item-radio"></div>
                                    </div>
                                </div>
                            `;
                }).join('')}
                        </div>
                    </div>
                `;
            }

            const hasTypeGroup = getVisibleGroups().some(g => g.groupType === 'Type' || g.groupType === 'types' || g.nameAr?.includes('النوع') || g.nameEn?.toLowerCase().includes('type'));
            if (product.types?.length && !hasTypeGroup) {
                const selectedSizePrice = state.selectedSize?.price || product.basePrice || 0;
                html += `
                    <div class="option-group">
                        <div class="option-group-title" style="font-size:15px">${Lang.t('type')}</div>
                        <div class="option-stack">
                            ${product.types.map(type => {
                    const priceVal = hasCombinedSizeAndType ? selectedSizePrice + (type.price || 0) : type.price;
                    const priceText = priceVal > 0 ? `${priceVal}${currency}` : `${product.basePrice || 0}${currency}`;
                    return `
                                <div class="option-item ${state.selectedType?.id === type.id ? 'selected' : ''}" data-action="type" data-id="${type.id}" style="padding:10px 15px">
                                    <span class="option-item-price">${priceText}</span>
                                    <div class="option-item-label">
                                        <span class="option-item-name" style="font-size:14px">${Lang.localized(type.nameAr, type.nameEn)}</span>
                                        <div class="option-item-radio"></div>
                                    </div>
                                </div>
                            `;
                }).join('')}
                        </div>
                    </div>
                `;
            }

            // إضافات بسيطة
            if (product.simpleAddons && product.simpleAddons.length > 0) {
                html += `
                     <div class="option-group">
                         <div class="option-group-title" style="font-size:15px">${Lang.current === 'ar' ? 'الإضافات' : 'Add-ons'}</div>
                         <div class="option-stack">
                             ${product.simpleAddons.map(addon => {
                    const isSelected = state.selectedSimpleAddons.some(a => a.id === addon.id);
                    const priceText = addon.price > 0 ? `+${addon.price}${currency}` : '';
                    const name = Lang.localized(addon.nameAr, addon.nameEn);
                    return `
                                     <div class="option-item ${isSelected ? 'selected' : ''}" data-action="simple-addon" data-addon-id="${addon.id}" style="padding:10px 15px">
                                         <span class="option-item-price">${priceText}</span>
                                         <div class="option-item-label">
                                             <span class="option-item-name" style="font-size:14px">${name}</span>
                                             <div class="option-item-check"></div>
                                         </div>
                                     </div>
                                 `;
                }).join('')}
                         </div>
                     </div>
                 `;
            }

            html += visibleGroups.filter(g => g.items && g.items.length > 0).map(group => {
                let groupLabel = Lang.localized(group.nameAr, group.nameEn);
                // Better logic for labeling groups as "Type" (النوع)
                const isTypeGroup = group.groupType?.toLowerCase() === 'type';

                if (isTypeGroup) {
                    groupLabel = Lang.current === 'ar' ? 'النوع' : 'Type';
                }

                return `
                    <div class="option-group">
                        <div class="option-group-title" style="font-size:15px">${groupLabel}</div>
                        <div class="option-stack">
                            ${group.items.map(item => {
                    const isSelected = selectedIds.has(item.id);
                    const selectorClass = group.allowMultiple ? 'option-item-check' : 'option-item-radio';
                    const priceText = item.price > 0 ? `+${item.price}${currency}` : '';
                    return `
                                    <div class="option-item ${isSelected ? 'selected' : ''}" data-action="addon" data-group-id="${group.id}" data-id="${item.id}" style="padding:10px 15px">
                                        <span class="option-item-price">${priceText}</span>
                                        <div class="option-item-label">
                                            <span class="option-item-name" style="font-size:14px">${Lang.localized(item.nameAr, item.nameEn)}</span>
                                            <div class="${selectorClass}"></div>
                                        </div>
                                    </div>
                                `;
                }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            html += `
                 <div class="note-field">
                     <label style="text-align:right; display:block; margin-bottom:10px; font-weight:900; font-size:14px">${Lang.t('addNote')}</label>
                     <textarea id="product-note" placeholder="${Lang.t('notes')}..." style="width:100%; border-radius:15px; border:2px solid #eee; padding:15px; text-align:right; font-size:14px">${state.note}</textarea>
                 </div>
             `;

            html += `
                </div>
                <div class="modal-footer">
                    <button class="add-to-cart-btn" data-action="add-to-cart" style="padding:15px; font-size:15px">${Lang.t('addToCart')} (${totalPrice.toFixed(0)}${currency})</button>
                </div>
            `;

            panel.innerHTML = html;

            // Restore scroll with a slight delay to ensure browser layout
            const newBody = panel.querySelector('.modal-body');
            if (newBody && scrollPos > 0) {
                setTimeout(() => { newBody.scrollTop = scrollPos; }, 0);
            }

            panel.querySelectorAll('[data-action]').forEach(element => {
                element.addEventListener('click', () => {
                    const action = element.dataset.action;

                    if (action === 'size') {
                        state.selectedSize = product.sizes.find(size => size.id == element.dataset.id);
                        render();
                        return;
                    }

                    if (action === 'type') {
                        state.selectedType = product.types.find(type => type.id == element.dataset.id);
                        render();
                        return;
                    }

                    if (action === 'addon') {
                        const group = addonGroups.find(current => current.id == element.dataset.groupId);
                        const item = group?.items.find(current => current.id == element.dataset.id);
                        if (!group || !item) return;
                        toggleAddon(group, item);
                        render();
                        return;
                    }

                    if (action === 'simple-addon') {
                        const addonId = Number(element.dataset.addonId);
                        const addon = product.simpleAddons?.find(a => a.id === addonId);
                        if (!addon) return;
                        const alreadySelected = state.selectedSimpleAddons.some(a => a.id === addonId);
                        if (alreadySelected) {
                            state.selectedSimpleAddons = state.selectedSimpleAddons.filter(a => a.id !== addonId);
                        } else {
                            state.selectedSimpleAddons.push(addon);
                        }
                        render();
                        return;
                    }

                    if (action === 'qty-minus') {
                        if (state.quantity > 1) state.quantity--;
                        render();
                        return;
                    }

                    if (action === 'qty-plus') {
                        state.quantity++;
                        render();
                        return;
                    }

                    if (action === 'add-to-cart') {
                        state.note = document.getElementById('product-note')?.value || '';
                        if (!validateRequiredGroups()) return;

                        const allAddons = [...state.selectedAddOns, ...state.selectedSimpleAddons];
                        const bDisc = product.branchDiscounts || product.branch_discounts || {};
                        const effectiveDiscount = (branchId !== undefined && bDisc[branchId] !== undefined)
                            ? Number(bDisc[branchId])
                            : branchDiscount;
                        Cart.addItem(
                            branchSlug,
                            product,
                            state.quantity,
                            state.selectedSize,
                            state.selectedType,
                            allAddons,
                            state.note,
                            effectiveDiscount
                        );
                        UI.hideModal('product-modal-overlay', 'product-modal');
                        UI.updateCartBadge(branchSlug);

                        // User specifically requested NOT to auto-open the cart when adding items
                        // setTimeout(() => {
                        //     UI.renderCartModal(branchSlug, currency);
                        //     UI.showModal('cart-modal-overlay', 'cart-modal');
                        // }, 300);

                        // Provide feedback inside the site button or custom toast if needed
                    }
                });
            });
        };

        try {
            render();
            UI.showModal('product-modal-overlay', 'product-modal');
        } catch (e) {
            console.error("Failed to render product modal:", e);
            alert("Sorry, an error occurred while displaying the product. Error: " + e.message);
        }
    },

    renderFamilyMealModal(product, addonGroups, branchSlug, currency, branchDiscount, branchId) {
        const panel = document.getElementById('product-modal');
        const familySize = product.familySize || 4;
        const isAr = Lang.current === 'ar';

        // بناء state لكل برغر
        const buildDefaultBurgerState = (index) => {
            const types = product.types || [];
            // توزيع نص/نص بالتناوب
            const defaultType = types.length > 1
                ? types[index % types.length]
                : (types[0] || null);
            return {
                selectedType: defaultType,
                selectedAddOns: [],
                note: ''
            };
        };

        let burgersState = Array.from({ length: familySize }, (_, i) => buildDefaultBurgerState(i));
        let openBurgerIndex = 0;
        let quantity = 1;

        const findGroupByItemId = (itemId) => addonGroups.find(g => g.items.some(it => it.id === itemId));

        const getVisibleGroups = () => addonGroups.filter(g => {
            const type = g.groupType || '';
            const name = (g.nameAr || '') + ' ' + (g.nameEn || '');
            // اخفي مجموعة النوع لأنها بتتعرض كـ pills
            if (type === 'type' || type === 'types' || name.includes('النوع')) return false;
            return true;
        });

        const toggleAddon = (burgerIdx, group, item) => {
            const state = burgersState[burgerIdx];
            const currentlySelected = state.selectedAddOns.find(a => a.id === item.id);
            if (group.allowMultiple) {
                if (currentlySelected) {
                    state.selectedAddOns = state.selectedAddOns.filter(a => a.id !== item.id);
                } else {
                    state.selectedAddOns.push({ ...item, groupType: group.groupType, groupNameAr: group.nameAr, groupNameEn: group.nameEn });
                }
            } else {
                if (currentlySelected) {
                    state.selectedAddOns = state.selectedAddOns.filter(a => a.id !== item.id);
                } else {
                    state.selectedAddOns = state.selectedAddOns.filter(a => {
                        const g = findGroupByItemId(a.id);
                        return !g || g.id !== group.id;
                    });
                    state.selectedAddOns.push({ ...item, groupType: group.groupType, groupNameAr: group.nameAr, groupNameEn: group.nameEn });
                }
            }
        };

        const renderBurgerPanel = (burgerIdx) => {
            const state = burgersState[burgerIdx];
            const selectedIds = new Set(state.selectedAddOns.map(a => a.id));
            const visibleGroups = getVisibleGroups();
            const types = product.types || [];

            let html = '';

            // النوع
            if (types.length > 0) {
                html += `<div class="option-group">
                    <div class="option-group-title" style="font-size:14px">${isAr ? 'النوع' : 'Type'}</div>
                    <div class="option-stack">
                        ${types.map(type => {
                    const isSelected = state.selectedType?.id === type.id;
                    return `<div class="option-item ${isSelected ? 'selected' : ''}" 
                                data-action="family-type" 
                                data-burger-idx="${burgerIdx}" 
                                data-type-id="${type.id}"
                                style="padding:10px 15px">
                                <span class="option-item-price">${type.price > 0 ? `+${type.price}${currency}` : ''}</span>
                                <div class="option-item-label">
                                    <span class="option-item-name" style="font-size:14px">${Lang.localized(type.nameAr, type.nameEn)}</span>
                                    <div class="option-item-radio"></div>
                                </div>
                            </div>`;
                }).join('')}
                    </div>
                </div>`;
            }

            // مجموعات الإضافات والبدون
            visibleGroups.forEach(group => {
                if (!group.items || group.items.length === 0) return;
                const isNote = (group.nameAr || '').includes('بدون') || (group.groupType || '').toLowerCase().includes('without');
                html += `<div class="option-group">
                    <div class="option-group-title" style="font-size:14px">${Lang.localized(group.nameAr, group.nameEn)}</div>
                    <div class="option-stack">
                        ${group.items.map(item => {
                    const isSelected = selectedIds.has(item.id);
                    const isNoteItem = (item.nameAr || '').includes('بدون') || (item.nameEn || '').toLowerCase().includes('without');
                    return `<div class="option-item ${isSelected ? 'selected' : ''} ${isNoteItem ? 'is-note-option' : ''}"
                                data-action="family-addon"
                                data-burger-idx="${burgerIdx}"
                                data-group-id="${group.id}"
                                data-item-id="${item.id}"
                                style="${isNoteItem ? 'border-color:#fca5a5;background:#fff5f5;' : ''}padding:10px 15px">
                                <span class="option-item-price">${item.price > 0 ? `+${item.price}${currency}` : ''}</span>
                                <div class="option-item-label">
                                    <span class="option-item-name" style="${isNoteItem ? 'color:#dc2626;font-weight:800;' : ''}font-size:14px">${isNoteItem ? '❌ ' : ''}${Lang.localized(item.nameAr, item.nameEn)}</span>
                                    <div class="${group.allowMultiple ? 'option-item-check' : 'option-item-radio'}"></div>
                                </div>
                            </div>`;
                }).join('')}
                    </div>
                </div>`;
            });

            return html;
        };

        const calculateTotal = () => {
            let base = product.basePrice || 0;
            // أضيف سعر الأنواع المختارة لكل برغر
            burgersState.forEach(state => {
                if (state.selectedType?.price) base += state.selectedType.price;
                state.selectedAddOns.forEach(a => { base += (a.price || 0); });
            });
            let unitPrice = base;
            if (product.discount > 0) unitPrice = unitPrice - (unitPrice * product.discount / 100);
            if (branchDiscount > 0) unitPrice = unitPrice - (unitPrice * branchDiscount / 100);
            return unitPrice * quantity;
        };

        const render = () => {
            const body = panel.querySelector('.modal-body');
            const scrollPos = body ? body.scrollTop : 0;

            const totalPrice = calculateTotal();
            const desc = Lang.localized(product.descriptionAr, product.descriptionEn);

            let html = `
                <div class="modal-header">
                    <button class="modal-close" onclick="UI.hideModal('product-modal-overlay','product-modal')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <span class="modal-title" style="font-size:1.2rem">${Lang.localized(product.nameAr, product.nameEn)}</span>
                </div>
                <div class="modal-body">
                    <div class="product-modal-image-wrap">
                        <img src="${product.imagePath || '/images/classic-cheeseburger__0x1e3y1qv68eiip.jpg'}" class="product-modal-image" alt="" />
                    </div>
                    ${desc ? `<div class="product-modal-desc">${desc}</div>` : ''}
            `;

            // Accordion لكل برغر
            for (let i = 0; i < familySize; i++) {
                const isOpen = openBurgerIndex === i;
                const state = burgersState[i];
                const typeName = state.selectedType ? Lang.localized(state.selectedType.nameAr, state.selectedType.nameEn) : '';
                const addonsCount = state.selectedAddOns.length;
                const burgerLabel = isAr ? `البيرجر ${i + 1}` : `Burger ${i + 1}`;
                const summary = typeName ? `${typeName}${addonsCount > 0 ? ` • ${addonsCount} ${isAr ? 'إضافة' : 'extras'}` : ''}` : '';

                html += `
                    <div class="family-burger-accordion ${isOpen ? 'open' : ''}" style="
                        border: 2px solid ${isOpen ? '#8B0000' : '#eee'};
                        border-radius: 18px;
                        margin-bottom: 10px;
                        overflow: hidden;
                        transition: border-color 0.2s;
                    ">
                        <div class="family-burger-header" data-action="family-toggle" data-idx="${i}" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 14px 18px;
                            cursor: pointer;
                            background: ${isOpen ? '#fff8f8' : '#fafafa'};
                        ">
                            <div style="display:flex;align-items:center;gap:10px">
                                <span style="font-size:1.3rem">🍔</span>
                                <div>
                                    <div style="font-weight:900;font-size:15px;color:#1a1a1a">${burgerLabel}</div>
                                    ${summary ? `<div style="font-size:12px;color:#8B0000;font-weight:700">${summary}</div>` : ''}
                                </div>
                            </div>
                            <span style="font-size:1.2rem;color:#8B0000;transform:rotate(${isOpen ? '180' : '0'}deg);transition:transform 0.2s">▾</span>
                        </div>
                        ${isOpen ? `<div class="family-burger-body" style="padding:15px;border-top:1px solid #eee">${renderBurgerPanel(i)}</div>` : ''}
                    </div>
                `;
            }

            // ملاحظة + كمية + زر
            html += `
                <div class="note-field">
                    <label style="text-align:right;display:block;margin-bottom:10px;font-weight:900;font-size:14px">${Lang.t('addNote')}</label>
                    <textarea id="product-note" placeholder="${Lang.t('notes')}..." style="width:100%;border-radius:15px;border:2px solid #eee;padding:15px;text-align:right;font-size:14px"></textarea>
                </div>
                </div>
                <div class="modal-footer">
                    <div class="cart-qty-control" style="margin-bottom:12px;justify-content:center">
                        <button data-action="family-qty-minus">−</button>
                        <span>${quantity}</span>
                        <button data-action="family-qty-plus">+</button>
                    </div>
                    <button class="add-to-cart-btn" data-action="family-add-to-cart" style="padding:15px;font-size:15px">
                        ${Lang.t('addToCart')} (${Math.floor(totalPrice)}${currency})
                    </button>
                </div>
            `;

            panel.innerHTML = html;

            // إعادة السكرول بعد الريندر
            const newBody = panel.querySelector('.modal-body');
            if (newBody && scrollPos > 0) {
                setTimeout(() => { newBody.scrollTop = scrollPos; }, 0);
            }

            // ربط الأحداث
            panel.querySelectorAll('[data-action]').forEach(el => {
                el.addEventListener('click', () => {
                    const action = el.dataset.action;

                    if (action === 'family-toggle') {
                        const idx = Number(el.dataset.idx);
                        openBurgerIndex = openBurgerIndex === idx ? -1 : idx;
                        render();
                        return;
                    }

                    if (action === 'family-type') {
                        const burgerIdx = Number(el.dataset.burgerIdx);
                        const typeId = Number(el.dataset.typeId);
                        burgersState[burgerIdx].selectedType = product.types.find(t => t.id === typeId) || null;
                        render();
                        return;
                    }

                    if (action === 'family-addon') {
                        const burgerIdx = Number(el.dataset.burgerIdx);
                        const groupId = Number(el.dataset.groupId);
                        const itemId = Number(el.dataset.itemId);
                        const group = addonGroups.find(g => g.id === groupId);
                        const item = group?.items.find(it => it.id === itemId);
                        if (!group || !item) return;
                        toggleAddon(burgerIdx, group, item);
                        render();
                        return;
                    }

                    if (action === 'family-qty-minus') {
                        if (quantity > 1) quantity--;
                        render();
                        return;
                    }

                    if (action === 'family-qty-plus') {
                        quantity++;
                        render();
                        return;
                    }

                    if (action === 'family-add-to-cart') {
                        const note = document.getElementById('product-note')?.value || '';

                        // بناء JSON منظم لكل برغر
                        const burgersJson = burgersState.map((state, i) => {
                            const withoutAddons = state.selectedAddOns.filter(a =>
                                (a.groupType || '').toLowerCase() === 'without' ||
                                (a.groupNameAr || '').includes('بدون') ||
                                (a.nameAr || '').includes('بدون') ||
                                (a.nameEn || '').toLowerCase().includes('without')
                            );
                            const normalAddons = state.selectedAddOns.filter(a =>
                                (a.groupType || '').toLowerCase() !== 'without' &&
                                !(a.groupNameAr || '').includes('بدون') &&
                                !(a.nameAr || '').includes('بدون') &&
                                !(a.nameEn || '').toLowerCase().includes('without')
                            );
                            return {
                                index: i + 1,
                                typeAr: state.selectedType ? (state.selectedType.nameAr || '') : '',
                                typeEn: state.selectedType ? (state.selectedType.nameEn || '') : '',
                                addons: normalAddons.map(a => ({ nameAr: a.nameAr || '', nameEn: a.nameEn || '', price: a.price || 0 })),
                                without: withoutAddons.map(a => ({ nameAr: a.nameAr || '', nameEn: a.nameEn || '' })),
                            };
                        });

                        const familyPayload = JSON.stringify({
                            type: 'family_meal',
                            burgers: burgersJson,
                            note: note
                        });

                        const allSelectedAddons = burgersState.flatMap(s => s.selectedAddOns);
                        const bDiscF = product.branchDiscounts || product.branch_discounts || {};
                        const effectiveDiscountF = (branchId !== undefined && bDiscF[branchId] !== undefined)
                            ? Number(bDiscF[branchId])
                            : branchDiscount;

                        Cart.addItem(
                            branchSlug,
                            product,
                            quantity,
                            null,
                            null,
                            allSelectedAddons,
                            familyPayload,
                            effectiveDiscountF
                        );

                        UI.hideModal('product-modal-overlay', 'product-modal');
                        UI.updateCartBadge(branchSlug);
                        return;
                    }
                });
            });
        };

        try {
            render();
            UI.showModal('product-modal-overlay', 'product-modal');
        } catch (e) {
            console.error("Failed to render family meal modal:", e);
            alert("Sorry, an error occurred. Error: " + e.message);
        }
    }
};

window.UI = UI;

const bindUIEvents = () => {
    // Modal Close
    document.getElementById('cart-modal-overlay')?.addEventListener('click', () => UI.hideModal('cart-modal-overlay', 'cart-modal'));
    document.getElementById('product-modal-overlay')?.addEventListener('click', () => UI.hideModal('product-modal-overlay', 'product-modal'));

    // Initial Badge Update
    const prefBranch = localStorage.getItem('uptown-preferred-branch');
    if (prefBranch) UI.updateCartBadge(prefBranch);

    // Header Scroll Effect
    const header = document.getElementById('site-header');
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header?.classList.add('is-scrolled');
        } else {
            header?.classList.remove('is-scrolled');
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    // Mobile Menu Toggle
    const mobileMenu = document.getElementById('ultra-mobile-menu');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('close-menu');

    const openMobileMenu = () => {
        mobileMenu?.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    };

    const closeMobileMenu = () => {
        mobileMenu?.classList.remove('is-open');
        document.body.style.overflow = '';
    };

    toggleBtn?.addEventListener('click', openMobileMenu);
    closeBtn?.addEventListener('click', closeMobileMenu);

    // Close mobile menu on link click
    mobileMenu?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    // Cart Button Click
    const cartBtn = document.getElementById('cart-btn');
    cartBtn?.addEventListener('click', () => {
        // Find active branch slug
        let branchSlug = '';
        const path = window.location.pathname;

        if (path.startsWith('/menu/')) {
            branchSlug = path.split('/')[2];
        } else if (path.startsWith('/checkout/')) {
            branchSlug = path.split('/')[2];
        } else {
            // Check localStorage
            branchSlug = localStorage.getItem('uptown-preferred-branch');
        }

        if (!branchSlug) {
            alert(Lang.current === 'ar' ? 'يرجى اختيار فرع أولاً' : 'Please choose a branch first');
            return;
        }

        const currency = Lang.current === 'ar' ? 'ILS' : 'ILS'; // or get from branch/settings
        UI.renderCartModal(branchSlug, currency);
        UI.showModal('cart-modal-overlay', 'cart-modal');
    });

    // Payment Icons Fallback (Handle errors in client-side)
    document.querySelectorAll('.hp-payment-grid img').forEach(img => {
        img.addEventListener('error', () => {
            img.style.display = 'none';
        });
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUIEvents, { once: true });
} else {
    bindUIEvents();
}