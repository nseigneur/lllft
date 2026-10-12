import json,glob,re,html,sys,urllib.request,concurrent.futures as cf
raw=sys.argv[1]
posts=[]
for f in sorted(glob.glob(f'{raw}/lion_posts_*.json')): posts+=json.load(open(f))
pat=re.compile(r'family tree|lineage|history of|who.s who|meet the|guide to|know your|origin|dynasty|dynasties|generation|legacy|story of the|tale of|rise and fall|pride|coalition|takeover|take-over|breakaway|cubs|lioness|male lions|males|female|lions',re.I)
sel=[p for p in posts if pat.search(html.unescape(p['title']['rendered']))]
def get(p):
    try:
        d=json.load(urllib.request.urlopen(f"https://blog.londolozi.com/wp-json/wp/v2/posts/{p['id']}?_fields=id,date,link,title,body,excerpt",timeout=30))
    except Exception as e:
        return p['id'],None
    b=d.get('body') or ''
    t=html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',b))).strip()
    open(f"{raw}/lion_bodies/{p['date'][:10]}_{p['id']}.txt",'w').write(f"TITLE: {html.unescape(p['title']['rendered'])}\nDATE: {p['date'][:10]}\nURL: {p['link']}\n\n{t}\n")
    return p['id'],len(t)
with cf.ThreadPoolExecutor(8) as ex: res=list(ex.map(get,sel))
print(len(sel),'selected;',sum(1 for _,l in res if l),'ok;',[i for i,l in res if not l][:20])
