import sys,random,json
from playwright.sync_api import sync_playwright
random.seed(5)
PACK=sys.argv[1] if len(sys.argv)>1 else 'Fire and Jade'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome' if False else None)
    pg=b.new_page(viewport={'width':1100,'height':760})
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','dist','spearhead.html'))+'')
    pg.wait_for_timeout(500)
    pg.evaluate("document.getElementById('hgo')&&document.getElementById('hgo').click()")
    def st():
        return pg.evaluate("""()=>{const G=window.__G,V=window.__V,q=G.req;return {pop:document.getElementById('pop').style.display=='flex',req:q&&q.t,who:q&&q.who,mode:V.mode&&V.mode.t,kind:V.mode&&V.mode.q&&V.mode.q.kind,busy:V.busy,over:G.S.over,ph:G.S.ph,round:G.S.round,act:G.S.act,nextDis:document.getElementById('next').disabled,zone:V.mode&&V.mode.zone?V.mode.zone.length:-1,ang:V.mode&&V.mode.a}}""")
    def screen(wx,wy):
        c=pg.evaluate("window.__V.cam");return c['tx']+wx*c['SC']*c['sc'],c['ty']+wy*c['SC']*c['sc']
    did_rot=False;did_move=False;stuck=0;last=None;steps=0;fights=0;cnt={};chg_try={};did_adj=False
    for step in range(4000):
        s=st();steps=step
        key=json.dumps(s,sort_keys=True)
        stuck=stuck+1 if key==last else 0;last=key
        if stuck>200:
            print('STUCK',s,pg.inner_text('#ht'));pg.screenshot(path='/tmp/stuck.png');break
        if s['over'] and not s['pop'] and s['req'] is None: break
        if s['req']=='act' and s['round']>=2 and s['ph']==3 and not globals().get('_shot'):
            globals()['_shot']=1;pg.screenshot(path='/tmp/shot.png')
        if s['mode']=='pickmap':
            cnt['pickmap']=cnt.get('pickmap',0)+1
            c=pg.evaluate("(()=>{const r=window.__V.mode.mi.it[0],o=r.ref;return r.kind=='o'?(o.length>3?[o[0],o[1]]:[o[0],o[1]]):[o.x,o.y]})()")
            pg.evaluate("([x,y])=>window.__V.tap(x,y)",c);pg.wait_for_timeout(60)
            if pg.evaluate("window.__V.mode&&window.__V.mode.t")=='pickmap':
                bb=pg.query_selector_all('#hb button');bb[-1].click();pg.wait_for_timeout(60)
            continue
        if s['mode']=='bar':
            bb=pg.query_selector_all('#hb button');bb[0].click();pg.wait_for_timeout(60);continue
        if s['pop']:
            btns=pg.query_selector_all('.sheet button:not([disabled])')
            if not btns: pg.keyboard.press('Escape');pg.wait_for_timeout(50);continue
            txt=pg.inner_text('.sheet')
            pick=btns[0]
            if 'Angriffe verteilen' in txt: pick=[b for b in btns if b.inner_text().startswith('Kämpfen')][0]
            if 'Spielstart' in txt:
                if not cnt.get('pk'): pick=[b for b in btns if PACK in b.inner_text()][0];cnt['pk']=1
                else: pick=[b for b in btns if b.inner_text()=='Weiter'][0]
            if 'Armee wählen' in txt: pick=[b for b in btns if 'Auswählen' in b.inner_text()][0]
            if 'Worauf soll das Nachrücken' in txt:
                tg=[b for b in btns if 'Missionsziel' in b.inner_text() or 'gelände' in b.inner_text().lower()]
                run=[b for b in btns if '▶' in b.inner_text()]
                pick=random.choice(tg) if (tg and random.random()<.4) else run[0]
                cnt['pilepop']=cnt.get('pilepop',0)+1
            elif 'Wie soll sich die Einheit aufstellen' in txt:
                pick=btns[cnt.get('fm',0)%len(btns)];cnt['fm']=cnt.get('fm',0)+1
            elif 'Modelle anpassen?' in txt:
                pick=btns[-1];cnt['offer']=cnt.get('offer',0)+1
            if cnt.get('seen',0)<400 and 'Angriff' in txt: print('POP',txt[:80].replace('\n',' | '));cnt['seen']=cnt.get('seen',0)+1
            pick.click();pg.wait_for_timeout(30);continue
        if s['busy']: pg.wait_for_timeout(60);continue
        if s['who']==1 or s['req'] is None: pg.wait_for_timeout(80);continue
        if s['mode']=='place':
            if s['zone']<0: pg.wait_for_timeout(60);continue
            z=pg.evaluate("window.__V.mode.zone")
            if z is None and cnt.get('zw',0)<200:
                cnt['zw']=cnt.get('zw',0)+1;pg.wait_for_timeout(60);continue
            if not z:
                if s['kind']=='terr' and cnt.get('rotz',0)<40:
                    cnt['rotz']=cnt.get('rotz',0)+1;pg.evaluate('window.__V.rot(Math.PI/10)');pg.wait_for_timeout(120);continue
                print('keine gültige Zone',s);pg.screenshot(path='/tmp/nozone.png');break
            zx,zy=random.choice(z)
            if s['kind']=='dep':
                sug=pg.evaluate("(()=>{const r=window.__V.ai(window.__G,window.__G.req,Math.random);return r&&r.x!=null?[r.x,r.y]:null})()")
                if sug: zx,zy=sug
            x,y=screen(zx,zy)
            pg.mouse.move(x,y);pg.mouse.down();pg.mouse.up();pg.wait_for_timeout(40)
            if s['kind'] in ('terr','relic'):
                if s['kind']=='terr' and not cnt.get('tapRot'):
                    a0=pg.evaluate("window.__V.mode.a");pg.mouse.move(x,y);pg.mouse.down();pg.mouse.up();pg.wait_for_timeout(40);a1=pg.evaluate("window.__V.mode.a")
                    d=((a1-a0)*180/3.14159265)%180;print('Drehung durch Antippen: %.0f°'%d);assert abs(d-18)<1,'Antippen dreht nicht um 18°';cnt['tapRot']=1
                    pg.mouse.move(x,y);pg.mouse.down();pg.mouse.move(x+30,y);pg.mouse.up();pg.wait_for_timeout(40)
                    assert pg.evaluate("window.__V.mode.t")=='place','Ziehen darf nicht platzieren'
                pg.click('#hy');pg.wait_for_timeout(60)
            continue
        if s['mode']=='fightsel':
            info=pg.evaluate("""()=>{const S=window.__G.S;const mine=S.U.filter(u=>u.o==0&&u.x>=0);for(const u of mine){const e=S.U.find(e=>e.o==1&&e.x>=0&&window.__V.dist(u,e)<=3);if(e&&!S.T.fought.includes(u.id))return [u.x,u.y,e.x,e.y]}return null}""")
            if info:
                x,y=screen(info[0],info[1]);pg.mouse.click(x,y);pg.wait_for_timeout(50)
                bt=[b for b in pg.query_selector_all('.sheet button:not([disabled])') if b.is_visible()]
                kb=[b for b in bt if 'Kämpfen' in b.inner_text()]
                if kb: kb[0].click();pg.wait_for_timeout(50);x,y=screen(info[2],info[3]);pg.mouse.click(x,y);fights+=1;pg.wait_for_timeout(50)
                else:
                    nb=[b for b in bt if 'Nicht kämpfen' in b.inner_text()]
                    if nb or bt: (nb or bt)[0].click()
                    else: pg.keyboard.press('Escape')
            else:
                # Einheit ohne Ziel: Fallback über Protokoll
                u=pg.evaluate("""()=>{const S=window.__G.S,G=window.__G;const l=window.__elig;return null}""")
                pg.evaluate("""()=>{const G=window.__G,S=G.S;const u=S.U.find(u=>u.o==0&&u.x>=0&&G.req&&G.req.check&&!G.req.check({a:'fight',u:u.id,t:null}));if(u)G.submit({a:'fight',u:u.id,t:null})}""")
            continue
        if s['mode']=='adj' and pg.evaluate("window.__V.mode.kind=='charge'"):
            ok=pg.evaluate("(()=>{const G=window.__G;return !!G.req&&G.req.t=='dest'})()")
            pg.click('#hy');pg.wait_for_timeout(60)
            s2=st()
            if s2['mode']=='adj': pg.click('#hx');pg.wait_for_timeout(40)
            else: cnt['chgP']=cnt.get('chgP',0)+1
            continue
        if s['mode']=='dest':
            d=pg.evaluate("(()=>{const m=window.__V.mode,S=window.__G.S,u=m.u;if(m.chg)return window.__V.chargeDest(S,u,m.q.roll);if(m.pile)return window.__V.pileDest(S,u,S.U.find(e=>e.id==m.tg));return null})()")
            if d:
                mm=pg.evaluate("window.__V.mode.chg?'chg':'pile'");
                if cnt.get(mm,0)==0: pg.screenshot(path='/tmp/claude-0/shot_'+mm+'.png')
                cnt[mm]=cnt.get(mm,0)+1
                x,y=screen(d['x'],d['y']);pg.mouse.click(x,y);pg.wait_for_timeout(40);continue
        if s['mode'] in ('dest','tgt'): pg.click('#hx');pg.wait_for_timeout(30);continue
        if s['req']=='act' and s['ph']==4 and s['act']==0 and chg_try.get(s['round'],0)<3:
            chg_try[s['round']]=chg_try.get(s['round'],0)+1
            info=pg.evaluate("""()=>{const G=window.__G,S=G.S;for(const u of S.U.filter(u=>u.o==0&&u.x>=0&&!S.Ph.used.includes(u.id))){const e=S.U.find(e=>e.o==1&&e.x>=0&&Math.hypot(u.x-e.x,u.y-e.y)-u.r-e.r<=10&&Math.hypot(u.x-e.x,u.y-e.y)-u.r-e.r>3);if(e)return [u.x,u.y]}return null}""")
            ok=False
            if info:
                x,y=screen(info[0],info[1]);pg.mouse.click(x,y);pg.wait_for_timeout(60)
                kb=[b for b in pg.query_selector_all('.sheet button:not([disabled])') if 'Angriff' in b.inner_text()]
                if kb: kb[0].click();ok=True;pg.wait_for_timeout(80)
                else:
                    cb=pg.query_selector_all('.sheet button');
                    if cb: cb[-1].click()
            print('chg try',s['round'],ok,pg.evaluate("window.__G.S.U.filter(u=>u.x>=0).map(u=>u.o+':'+u.x.toFixed(0)+','+u.y.toFixed(0)).join(' ')"))
            if ok: pg.wait_for_timeout(80);continue
        if s['req']=='act' and s['ph']==2 and s['act']==0 and not did_adj and s['round']>=1:
            did_adj=True
            info=pg.evaluate("""()=>{const S=window.__G.S;const u=S.U.find(u=>u.o==0&&u.x>=0&&u.n>=3&&!S.Ph.used.includes(u.id));if(!u)return null;const m=u.M[u.M.length-1];return {x:u.x,y:u.y,mx:u.x+m.dx,my:u.y+m.dy,n:u.M.length,id:u.id}}""")
            if info:
                x,y=screen(info['x'],info['y']);pg.mouse.click(x,y);pg.wait_for_timeout(60)
                kb=[b for b in pg.query_selector_all('.sheet button:not([disabled])') if 'einzeln' in b.inner_text()]
                if kb:
                    kb[0].click();pg.wait_for_timeout(60)
                    x,y=screen(info['mx'],info['my']);pg.mouse.move(x,y);pg.mouse.down();x2,y2=screen(info['mx']+.4,info['my']+.4);pg.mouse.move(x2,y2,steps=4);pg.mouse.up();pg.wait_for_timeout(60)
                    pg.click('#hy');pg.wait_for_timeout(80)
                    moved=pg.evaluate("(id=>{const S=window.__G.S;return S.T.adjB.includes(id)})(%d)"%info['id'])
                    print('Einzelmodell-Bewegung per Klick:',moved)
                else:
                    cb=pg.query_selector_all('.sheet button')
                    if cb: cb[-1].click()
                continue
        if s['req']=='act' and not s['nextDis']:
            if s['ph']==2 and s['round']==1 and not did_move and s['act']==0:
                us=pg.evaluate("(()=>window.__G.S.U.filter(u=>u.o==0&&u.x>=0&&u.mv>=5).map(u=>[u.x,u.y,u.mv]))()")
                us=[v for v in us if 140<screen(v[0],v[1])[1]<620] or us
                u=us[0];x,y=screen(u[0],u[1]);pg.mouse.click(x,y);pg.wait_for_timeout(60)
                bt=[b for b in pg.query_selector_all('.sheet button:not([disabled])') if 'Normale Bewegung' in b.inner_text()]
                if bt and bt[0].is_visible():
                    bt[0].click();pg.wait_for_timeout(60);x,y=screen(u[0],u[1]+3);pg.mouse.click(x,y);pg.wait_for_timeout(60)
                    now=pg.evaluate("(()=>{const q=window.__G.S.U.find(v=>v.o==0&&Math.abs(v.x-%f)<.01);return window.__G.S.T.moved.length})()"%u[0])
                    print('Bewegung per Klick, bewegte Einheiten:',now)
                did_move=True;continue
            pg.click('#next');pg.wait_for_timeout(20);continue
        pg.wait_for_timeout(50)
    res=pg.evaluate("(()=>{const S=window.__G.S;return {round:S.round,over:S.over,vp:S.P.map(p=>p.vp),dead:S.dead.length,log:window.__G.log.length}})()")
    pg.screenshot(path='/tmp/claude-0/shot_end.png');print('Angriffe/Nachrücken per Klick:',cnt);print('Ende:',res,'Schritte',steps,'Kämpfe per Klick',fights)
    pg.screenshot(path='/tmp/end.png')
    b.close()
print('Konsolenfehler:',errs[:5] if errs else 'keine')
