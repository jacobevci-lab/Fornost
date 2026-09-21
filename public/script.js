const state={lang:'en'};
    const allLang=()=>document.querySelectorAll('[data-lang]');
    function setLang(lang){
      state.lang=lang; document.documentElement.lang=lang;
      allLang().forEach(el=>el.classList.toggle('show',el.dataset.lang===lang));
      document.querySelectorAll('[data-set-lang]').forEach(b=>b.classList.toggle('active',b.dataset.setLang===lang));
      document.title=lang==='tr'?'Fornost Security | Kurumsal Siber Güvenlik Danışmanlığı':'Fornost Security | Enterprise Cyber Security Advisory';
      const desc=document.getElementById('metaDescription');
      if(desc) desc.content=lang==='tr'?'Fornost Security — Enterprise security architecture, secure-by-design, siber risk, GRC, bulut, kimlik, uygulama güvenliği ve güvenlik operasyonları danışmanlığı.':'Fornost Security — Enterprise cyber security architecture, secure-by-design, cyber risk, GRC, cloud, identity, application security and security operations advisory.';
      document.querySelectorAll('[data-set-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.setLang===lang)));
      localStorage.setItem('fornost-lang',lang);
    }
    document.querySelectorAll('[data-set-lang]').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.setLang)));
    setLang(localStorage.getItem('fornost-lang')||'en');

    const menu=document.getElementById('menu'),links=document.getElementById('links');
    menu.addEventListener('click',()=>{const open=links.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{links.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
    document.getElementById('year').textContent=new Date().getFullYear();
