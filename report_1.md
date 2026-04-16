# Agentic RAG Architecture Notes

## Humanloop — RAG Architectures

Humanloop içeriği, müşteri destek gibi doğruluk odaklı senaryolarda basit retrieval + generation hattının çoğu zaman yeterli olmadığını; corrective RAG gibi desenlerde retrieval kalitesinin ayrıca değerlendirildiğini ve yetersiz retrieval durumunda ek retrieval adımları veya alternatif kaynakların devreye alındığını vurguluyor. Buradaki önemli fikir, cevabın tek seferde üretilmesi değil, önce retrieval kalitesinin sınanmasıdır.

## Tiger Data — Agentic RAG Best Practices

Tiger Data yazısı, production agentic RAG'in sadece embedding ve vector index işi olmadığını; doküman hazırlama, chunking, tool calling, prompting, performans optimizasyonu, monitoring, benchmarking ve retrieval evaluation gibi ayrı katmanlardan oluştuğunu vurguluyor. Özellikle PostgreSQL + pgvector çizgisi, ayrı bir vector DB zorunlu değildir tezini savunuyor; yani dış SQL/vector katmanı performans için kullanılabilir ama bunun asıl değeri çoğu zaman veri modelleme, gözlemlenebilirlik ve kontrol tarafındadır.

## Supabase for Agents

Supabase'in agents sayfası, agent uygulamaları için PostgreSQL tabanı, pgvector ile semantic search, Edge Functions ile düşük gecikmeli sunucu tarafı işleme ve tek platformda veri + araç + hafıza yaklaşımını öne çıkarıyor. Bu, Botpress'in konuşma/orchestration katmanı ile Supabase'in veri/retrieval katmanını ayırarak birlikte kullanılabileceğini destekliyor.

## Reliability evaluation source attempt

AWS kaynağı platform politikası nedeniyle açılamadı. Ancak ihtiyaç duyduğumuz araştırma başlığı netleşti: güvenilir RAG sistemlerinde retrieval ve generation ayrı ayrı değerlendiriliyor; yalnızca son cevaba bakmak yeterli kabul edilmiyor. Bu başlık için alternatif erişilebilir kaynakla devam edilecek.

## Evidently AI — RAG Evaluation

Evidently içeriği, RAG sistemlerinde problemin tek bir yerde aranamayacağını açık biçimde anlatıyor: retrieval ve generation ayrı değerlendirilmeli. Retrieval tarafında relevance ve ranking, generation tarafında groundedness/faithfulness ve answer quality ayrı ölçülmeli. Bu, mevcut Botpress botunda da “ürün yanlış mı bulunuyor, yoksa doğru ürün bulunup yanlış mı sunuluyor?” ayrımını sistematik test etmek gerektiğini destekliyor.

## Supabase Querying Vectors

Supabase'in resmi vector querying dokümanı, similarity search, semantic search, filtered similarity search ve hybrid search (vector sonuçlarını relational veriyle birleştirme) desenlerini açıkça destekliyor. Ürün önerisi örneği de doğrudan verilmiş durumda: embedding + metadata filtreleri + relational join ile ürün döndürme. Bu, dış veri katmanına geçildiğinde Botpress'in konuşma/orchestration aracı olarak kalıp; retrieval'ın Supabase üzerinde, özellikle hybrid search ve metadata filtreleriyle daha kontrollü yürütülebileceğini gösteriyor.
