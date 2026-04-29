// ===== Cart Module =====
const Cart = {
    _carts: JSON.parse(localStorage.getItem('carts') || '{}'),
    _listeners: [],

    _save() {
        localStorage.setItem('carts', JSON.stringify(this._carts));
        this._listeners.forEach(fn => fn());
    },

    onChange(fn) { this._listeners.push(fn); },

    getItems(branchSlug) { return this._carts[branchSlug] || []; },

    addItem(branchSlug, product, quantity, selectedSize, selectedType, selectedAddOns, note, branchDiscount = 0) {
        if (!this._carts[branchSlug]) this._carts[branchSlug] = [];
        const finalPrice = this._calcPrice(product, selectedSize, selectedType, selectedAddOns, branchDiscount);
        // ← السعر قبل خصم الفرع فقط
        const priceBeforeBranchDiscount = this._calcPrice(product, selectedSize, selectedType, selectedAddOns, 0);
        const discountAmount = priceBeforeBranchDiscount - finalPrice;

        this._carts[branchSlug].push({
            id: `${product.id}-${Date.now()}`,
            productId: product.id,
            nameAr: product.nameAr,
            nameEn: product.nameEn,
            quantity,
            selectedSize,
            selectedType,
            selectedAddOns: selectedAddOns || [],
            note: note || '',
            finalPrice,
            originalPrice: priceBeforeBranchDiscount,   // ← جديد
            discountAmount,                               // ← جديد
            discountPercent: branchDiscount,              // ← جديد
            imagePath: product.imagePath,
            branchDiscount
        });
        this._save();
    },

    updateItem(branchSlug, itemId, product, quantity, selectedSize, selectedType, selectedAddOns, note, branchDiscount = 0) {
        const items = this._carts[branchSlug];
        if (!items) return;
        const idx = items.findIndex(i => i.id === itemId);
        if (idx === -1) return;
        const finalPrice = this._calcPrice(product, selectedSize, selectedType, selectedAddOns, branchDiscount);
        const priceBeforeBranchDiscount = this._calcPrice(product, selectedSize, selectedType, selectedAddOns, 0);
        const discountAmount = priceBeforeBranchDiscount - finalPrice;
        items[idx] = {
            ...items[idx],
            quantity, selectedSize, selectedType, selectedAddOns, note,
            finalPrice,
            originalPrice: priceBeforeBranchDiscount,
            discountAmount,
            discountPercent: branchDiscount,
            branchDiscount
        };
        this._save();
    },
    removeItem(branchSlug, itemId) {
        if (!this._carts[branchSlug]) return;
        this._carts[branchSlug] = this._carts[branchSlug].filter(i => i.id !== itemId);
        this._save();
    },

    setQuantity(branchSlug, itemId, quantity) {
        if (!this._carts[branchSlug]) return;
        const item = this._carts[branchSlug].find(i => i.id === itemId);
        if (!item) return;
        if (quantity <= 0) {
            this.removeItem(branchSlug, itemId);
        } else {
            item.quantity = quantity;
            this._save();
        }
    },

    clear(branchSlug) {
        this._carts[branchSlug] = [];
        this._save();
    },

    getTotal(branchSlug) {
        return this.getItems(branchSlug).reduce((sum, i) => sum + i.finalPrice * i.quantity, 0);
    },

    getCount(branchSlug) {
        return this.getItems(branchSlug).reduce((sum, i) => sum + i.quantity, 0);
    },

    _calcPrice(product, selectedSize, selectedType, selectedAddOns, branchDiscount = 0) {
        const hasCombinedSizeAndType = !!product.sizes?.length && !!product.types?.length;
        let price = product.basePrice || 0;
        if (selectedSize && hasCombinedSizeAndType) price = selectedSize.price + (selectedType?.price || 0);
        else if (selectedSize) price = selectedSize.price;
        else if (selectedType) price = selectedType.price;
        const addonsTotal = (selectedAddOns || []).reduce((sum, a) => sum + (a.price || 0), 0);
        price += addonsTotal;
        if (product.discount > 0) {
            price = price - (price * product.discount / 100);
        }
        if (branchDiscount > 0) {
            price = price - (price * branchDiscount / 100);
        }
        return price;
    }
};

window.Cart = Cart;