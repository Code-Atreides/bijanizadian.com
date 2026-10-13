export function filterMapSchools(schools,query=''){
 const term=query.trim().toLocaleLowerCase();
 return schools.filter(s=>!term||[s.name,s.city,s.state,...(s.aliases||[])].join(' ').toLocaleLowerCase().includes(term)).sort((a,b)=>a.name.localeCompare(b.name));
}
export function mapInviteEligible({ready,national,intro,visible,overlay,opened}){return ready&&national&&!intro&&visible&&!overlay&&!opened;}
