-- =====================================================================
-- İSTEĞE BAĞLI örnek veri: tasarımdaki 22 örnek dilek.
-- Bunlar GERÇEK ziyaretçi dilekleri değildir. Yayına çıkmadan önce silmeni öneririz
-- (Admin panelinden tek tek Sil ya da: delete from public.wishes;  -- tüm dilekleri siler).
-- Tetikleyici sayesinde 'approved' olarak eklenenler otomatik boş slotlara asılır.
-- =====================================================================
insert into public.wishes (author_name, wish_text, ribbon_color, status) values
  ('Aslı D.',        'Tüm doğanın ve sevdiklerimin dengesi korunsun, bahçelerimiz neşeyle dolsun.', '#10b981', 'approved'),
  ('Zeynep B.',      'Emeklerimizin karşılık bulduğu, bolluk ve ferahlık dolu aydınlık günler gelsin.', '#f59e0b', 'approved'),
  ('Melis A.',       'Kırılan kalplerin yumuşakça onarıldığı ve affetmenin getirdiği hafiflik hayatımıza yerleşsin.', '#8b5cf6', 'approved'),
  ('Emre C.',        'Sevgiyle baktığım her yerde samimiyet ve içten bir tebessüm bulmak tek arzum.', '#ef4444', 'approved'),
  ('Caner S.',       'Zihnimdeki sis dağılsın, yeni başlangıçlar için masmavi berrak bir ufuk açılsın.', '#0ea5e9', 'approved'),
  ('Seda K.',        'Kendime karşı daha şefkatli olmayı ve küçük mutlulukları kutlamayı diliyorum.', '#ec4899', 'approved'),
  ('Burak Y.',       'Gereksiz yüklerden arınmış, sade, temiz ve dürüst bir yolculuk niyetiyle...', '#f8fafc', 'approved'),
  ('Gülseren T.',    'Ailemizdeki herkesin sıhhati daim olsun, soframızın tadı hiç kaçmasın.', '#f97316', 'approved'),
  ('Kerem V.',       'Toprağa diktiğimiz fidanlar gibi umutlarımız da kök salsın ve boy versin.', '#10b981', 'approved'),
  ('Hande M.',       'Yıllardır ertelediğim o uzun yolculuğa çıkma cesaretini bulabilmek.', '#06b6d4', 'approved'),
  ('Oğuz A.',        'Yaralarımızın sevgiyle sarıldığı, dostlukların kıymetinin bilindiği bir dünya.', '#ef4444', 'approved'),
  ('Defne Ç.',       'Kelimelerimin insanlara güç ve huzur verdiği bir yazar olabilmek.', '#0ea5e9', 'approved'),
  ('Deniz P.',       'Geceleri yastığa başımı koyduğumda vicdanımın ve zihnimin tamamen dingin olması.', '#8b5cf6', 'approved'),
  ('Tolga & İrem',   'Kurduğumuz küçük atölyenin kendi ayakları üstünde durup büyümesi.', '#f59e0b', 'approved'),
  ('Nurhan H.',      'Küskünlüklerin bir sıcak çay eşliğinde unutulup sarılmaya dönüşmesi.', '#ec4899', 'approved'),
  ('Ece L.',         'Sokaktaki tüm dilsiz canların korunduğu, soğuktan korunacak bir yuva bulduğu günler.', '#10b981', 'approved'),
  ('Banu Öğretmen',  'Büyük sınavlara hazırlanan tüm gençlerin emeklerinin karşılığını sevinçle alması.', '#0ea5e9', 'approved'),
  ('Serkan R.',      'Yurtdışındaki kardeşime kavuşmak ve yeniden aynı masada gülüşebilmek.', '#f97316', 'approved'),
  ('Aliye G.',       'Hastanede şifa bekleyen annemin bu bahar bahçedeki çiçekleri görebilmesi.', '#f8fafc', 'approved'),
  ('Sina T.',        'İçimdeki çocuksu merakı ve keşfetme arzusunu hiç kaybetmemek.', '#8b5cf6', 'approved'),
  ('Ceyda U.',       'Kalpten kalbe kurulan köprülerin mesafelerden daha güçlü olduğunu unutmamak.', '#ef4444', 'approved'),
  ('Fırat N.',       'Her sabah güne minnetle ve umut dolu bir fincan kahveyle uyanabilmek.', '#f59e0b', 'approved');
