/** Bitdefender / similar AV extensions inject this before React hydrates. */
const ATTR = 'bis_skin_checked';

export function getStripExtensionHydrationAttrsScript() {
  return `(function(){
  function clean(el){
    if (!el || !el.removeAttribute || !el.hasAttribute) return;
    if (el.hasAttribute('${ATTR}')) el.removeAttribute('${ATTR}');
  }
  function sweep(root){
    if (!root) return;
    if (root.nodeType === 1) clean(root);
    if (!root.querySelectorAll) return;
    var nodes = root.querySelectorAll('[${ATTR}]');
    for (var i = 0; i < nodes.length; i += 1) clean(nodes[i]);
  }
  try { sweep(document.documentElement); } catch (e) {}
  if (typeof MutationObserver === 'undefined') return;
  var obs = new MutationObserver(function(muts){
    for (var i = 0; i < muts.length; i += 1) {
      var m = muts[i];
      if (m.type === 'attributes') { clean(m.target); continue; }
      var added = m.addedNodes || [];
      for (var j = 0; j < added.length; j += 1) sweep(added[j]);
    }
  });
  try {
    obs.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['${ATTR}']
    });
  } catch (e) {}
  function stop(){ try { obs.disconnect(); } catch (e) {} }
  window.addEventListener('load', function(){ sweep(document); setTimeout(stop, 1500); });
})();`;
}
