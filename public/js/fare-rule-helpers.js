(function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        var result = factory();
        root.getFareRuleApiType = result.getFareRuleApiType;
    }
})(typeof window !== 'undefined' ? window : this, function() {
    function getFareRuleApiType(ruleId) {
        if (!ruleId || ruleId === '00000') return null;
        if (/^(CFR|FR|OFR)/.test(ruleId)) return 'detail';
        if (/^IFR/.test(ruleId)) return 'official';
        return null;
    }
    return { getFareRuleApiType: getFareRuleApiType };
});
