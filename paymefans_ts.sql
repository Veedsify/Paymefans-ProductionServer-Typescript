-- phpMyAdmin SQL Dump
-- version 5.2.2deb1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 31, 2025 at 10:22 PM
-- Server version: 11.8.1-MariaDB-2
-- PHP Version: 8.4.5

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `paymefans_ts`
--

-- --------------------------------------------------------

--
-- Table structure for table `BlockedGroupParticipant`
--

CREATE TABLE `BlockedGroupParticipant` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Cart`
--

CREATE TABLE `Cart` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `size_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `CommentImpression`
--

CREATE TABLE `CommentImpression` (
  `id` int(11) NOT NULL,
  `comment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `postId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Conversations`
--

CREATE TABLE `Conversations` (
  `id` int(11) NOT NULL,
  `conversation_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Conversations`
--

INSERT INTO `Conversations` (`id`, `conversation_id`, `created_at`, `updated_at`) VALUES
(1, 'CONV8d46bb5616d444599e1e33351bcac08b', '2025-03-22 22:19:06.222', '2025-03-22 22:19:06.222'),
(2, 'CONV8a3a7536c64341c3bd6448098717e878', '2025-03-23 08:24:12.842', '2025-03-23 08:24:12.842'),
(3, 'CONVf84a278665e24abfb6487c872b86c886', '2025-03-24 11:42:53.222', '2025-03-24 11:42:53.222'),
(4, 'CONVf3afb1f40d9b4a77acc12c0c46ce6d37', '2025-03-26 15:50:39.514', '2025-03-26 15:50:39.514'),
(5, 'CONVe1812d2bac8d4255b3216329e564d0f7', '2025-03-26 15:51:49.766', '2025-03-26 15:51:49.766');

-- --------------------------------------------------------

--
-- Table structure for table `FAQ`
--

CREATE TABLE `FAQ` (
  `id` int(11) NOT NULL,
  `question` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `FAQAnswers`
--

CREATE TABLE `FAQAnswers` (
  `id` int(11) NOT NULL,
  `faq_id` int(11) NOT NULL,
  `answer` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Follow`
--

CREATE TABLE `Follow` (
  `id` int(11) NOT NULL,
  `follow_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `follower_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Follow`
--

INSERT INTO `Follow` (`id`, `follow_id`, `user_id`, `follower_id`, `created_at`, `updated_at`) VALUES
(1, 'FOL5d7382bffb464e038977f1ec261c935c', 1, 2, '2025-03-22 22:19:06.390', '2025-03-22 22:19:06.390'),
(2, 'FOL9f20b3ae792b423eae0d16f1592bd1a6', 1, 3, '2025-03-23 08:24:12.888', '2025-03-23 08:24:12.888'),
(3, 'FOLd98cf027024a44b880069e8a2f75eb2e', 1, 4, '2025-03-26 15:50:39.543', '2025-03-26 15:50:39.543'),
(4, 'FOLfc4302e7294b4eb1b34af362830a41a8', 2, 3, '2025-03-29 01:21:30.471', '2025-03-29 01:21:30.471');

-- --------------------------------------------------------

--
-- Table structure for table `GlobalPointsBuy`
--

CREATE TABLE `GlobalPointsBuy` (
  `id` int(11) NOT NULL,
  `points_buy_id` varchar(191) NOT NULL,
  `points` int(11) NOT NULL,
  `amount` double NOT NULL,
  `conversion_rate` double NOT NULL,
  `currency` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `GlobalPointsBuy`
--

INSERT INTO `GlobalPointsBuy` (`id`, `points_buy_id`, `points`, `amount`, `conversion_rate`, `currency`, `created_at`, `updated_at`) VALUES
(1, '2d0a796d2-2527-4a8b-be52-e7edb6d9afe7', 10, 1000, 100, '$', '2025-03-23 00:51:30.000', '2025-03-23 00:51:30.000');

-- --------------------------------------------------------

--
-- Table structure for table `GroupParticipants`
--

CREATE TABLE `GroupParticipants` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Groups`
--

CREATE TABLE `Groups` (
  `id` int(11) NOT NULL,
  `group_id` char(255) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `GroupSettings`
--

CREATE TABLE `GroupSettings` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` longtext NOT NULL,
  `group_icon` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `HelpArticles`
--

CREATE TABLE `HelpArticles` (
  `id` int(11) NOT NULL,
  `article_id` varchar(191) NOT NULL,
  `category_id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `content` longtext NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `HelpCategory`
--

CREATE TABLE `HelpCategory` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `HelpContact`
--

CREATE TABLE `HelpContact` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` longtext NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `LiveStream`
--

CREATE TABLE `LiveStream` (
  `id` int(11) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  `stream_id` varchar(191) NOT NULL,
  `stream_token` longtext NOT NULL,
  `user_stream_id` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `stream_call_id` varchar(191) NOT NULL,
  `stream_status` varchar(191) NOT NULL DEFAULT 'offline',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `LiveStreamComment`
--

CREATE TABLE `LiveStreamComment` (
  `id` int(11) NOT NULL,
  `live_comment_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `live_id` int(11) NOT NULL,
  `comment` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `LiveStreamLike`
--

CREATE TABLE `LiveStreamLike` (
  `id` int(11) NOT NULL,
  `live_like_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `live_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `LiveStreamParticipants`
--

CREATE TABLE `LiveStreamParticipants` (
  `id` int(11) NOT NULL,
  `stream_id` longtext NOT NULL,
  `host_id` varchar(191) NOT NULL,
  `participant_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `liveStreamId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `LiveStreamView`
--

CREATE TABLE `LiveStreamView` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `live_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Messages`
--

CREATE TABLE `Messages` (
  `id` int(11) NOT NULL,
  `message_id` varchar(191) NOT NULL,
  `sender_id` varchar(191) NOT NULL,
  `receiver_id` varchar(191) NOT NULL,
  `seen` tinyint(1) NOT NULL DEFAULT 0,
  `message` longtext NOT NULL,
  `attachment` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachment`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `conversationsId` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Messages`
--

INSERT INTO `Messages` (`id`, `message_id`, `sender_id`, `receiver_id`, `seen`, `message`, `attachment`, `created_at`, `updated_at`, `conversationsId`) VALUES
(1, 'MSGd881bc129afa4abab14a552a1fc2d246', '0hhc5ms5dtti', 'fbab106820c84ee69a2e02e521bcae0d', 0, 'Welcome to PayMeFans, @dikewisdom! <br>We are excited to have you here.<br>If you have any questions or need help, feel free to reach out to us.', '[]', '2025-03-22 22:19:06.241', '2025-03-22 22:19:06.241', 'CONV8d46bb5616d444599e1e33351bcac08b'),
(2, 'MSG2e389fabfa42460896b4c898d1d21409', '0hhc5ms5dtti', '8eb2e4f175924697bbd97ce1dd036c57', 0, 'Welcome to PayMeFans, @miatest1! <br>We are excited to have you here.<br>If you have any questions or need help, feel free to reach out to us.', '[]', '2025-03-23 08:24:12.870', '2025-03-23 08:24:12.870', 'CONV8a3a7536c64341c3bd6448098717e878'),
(3, 'MSGf05c0a165b4c4671bf41a8e1f792c0a6', '0hhc5ms5dtti', '853440530ffa495aaf686a2400e68792', 0, 'Welcome to PayMeFans, @miketyson! <br>We are excited to have you here.<br>If you have any questions or need help, feel free to reach out to us.', '[]', '2025-03-26 15:50:39.544', '2025-03-26 15:50:39.544', 'CONVf3afb1f40d9b4a77acc12c0c46ce6d37');

-- --------------------------------------------------------

--
-- Table structure for table `Model`
--

CREATE TABLE `Model` (
  `id` int(11) NOT NULL,
  `firstname` varchar(191) NOT NULL,
  `lastname` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `gender` varchar(191) NOT NULL,
  `dob` datetime(3) NOT NULL,
  `country` varchar(191) NOT NULL,
  `hookup` tinyint(1) NOT NULL DEFAULT 0,
  `verification_video` longtext DEFAULT NULL,
  `verification_image` longtext DEFAULT NULL,
  `verification_status` tinyint(1) NOT NULL DEFAULT 0,
  `verification_state` enum('not_started','started','pending','approved','rejected') NOT NULL DEFAULT 'not_started',
  `token` varchar(255) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Model`
--

INSERT INTO `Model` (`id`, `firstname`, `lastname`, `user_id`, `gender`, `dob`, `country`, `hookup`, `verification_video`, `verification_image`, `verification_status`, `verification_state`, `token`, `created_at`) VALUES
(1, 'Dike ', 'Wisdom', 2, 'male', '1990-09-12 00:00:00.000', 'Nigeria', 1, NULL, NULL, 1, 'approved', 'MDLece9d6e95c194bc88711910af9118e1b', '2025-03-22 23:35:08.753'),
(2, 'Mike ', 'Tyson', 4, 'female', '2000-12-03 00:00:00.000', 'Aland Islands', 1, NULL, NULL, 1, 'approved', 'MDLfbdd7df50fb542229732a5e6eab3967a', '2025-03-31 17:32:45.068');

-- --------------------------------------------------------

--
-- Table structure for table `ModelSubscriptionPack`
--

CREATE TABLE `ModelSubscriptionPack` (
  `id` int(11) NOT NULL,
  `subscription_id` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ModelSubscriptionPack`
--

INSERT INTO `ModelSubscriptionPack` (`id`, `subscription_id`, `created_at`, `updated_at`, `user_id`) VALUES
(1, 'SUB79a70a1ff833469eafd092c8dccbe46c', '2025-03-22 22:19:06.165', '2025-03-22 22:19:06.165', 2),
(2, 'SUB981f9e5a372d4d4d9696d0588b07d8b7', '2025-03-23 08:24:12.807', '2025-03-23 08:24:12.807', 3),
(3, 'SUBae0494be321e45998f30a9690caf4a09', '2025-03-26 15:50:39.465', '2025-03-26 15:50:39.465', 4);

-- --------------------------------------------------------

--
-- Table structure for table `ModelSubscriptionTier`
--

CREATE TABLE `ModelSubscriptionTier` (
  `id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `tier_name` varchar(191) NOT NULL,
  `tier_price` double NOT NULL,
  `tier_description` varchar(191) NOT NULL,
  `tier_duration` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ModelSubscriptionTier`
--

INSERT INTO `ModelSubscriptionTier` (`id`, `subscription_id`, `tier_name`, `tier_price`, `tier_description`, `tier_duration`, `created_at`, `updated_at`) VALUES
(2, 1, 'Main', 400, 'Hey all things', '28', '2025-03-26 15:53:03.126', '2025-03-26 15:53:03.126');

-- --------------------------------------------------------

--
-- Table structure for table `Notifications`
--

CREATE TABLE `Notifications` (
  `id` int(11) NOT NULL,
  `notification_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` longtext NOT NULL,
  `action` enum('follow','like','purchase','comment','repost','message','live','sparkle') NOT NULL,
  `url` varchar(191) NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Notifications`
--

INSERT INTO `Notifications` (`id`, `notification_id`, `user_id`, `message`, `action`, `url`, `read`, `created_at`, `updated_at`) VALUES
(1, 'NOTfcd151061b2e45f78e992c3c1bad628f', 2, 'Thanks for joining us and creating an account, <strong>Dike Wisdom</strong>. We are thrilled to meet you!', 'sparkle', '/profile', 1, '2025-03-22 22:19:06.222', '2025-03-27 10:56:22.153'),
(2, 'NOTaf41f0ad7175437fa4241b0b03958385', 2, 'Your Paypoints Purchase was successful, <strong>72</strong> points have been added to your balance.', 'purchase', '/wallet', 1, '2025-03-23 00:36:18.304', '2025-03-27 10:56:15.552'),
(3, 'NOTf63e8e3065b04228a43abe80a18787af', 2, 'Your Paypoints Purchase was successful, <strong>810</strong> points have been added to your balance.', 'purchase', '/wallet', 1, '2025-03-23 00:47:54.828', '2025-03-27 10:52:48.254'),
(4, 'NOT6300e0ae70134d309757134b6d8c9d45', 2, 'Your Paypoints Purchase was successful, <strong>63</strong> points have been added to your balance.', 'purchase', '/wallet', 1, '2025-03-23 00:48:26.598', '2025-03-27 10:52:11.687'),
(5, 'NOT304408da470b47aba3b865364df089fc', 3, 'Thanks for joining us and creating an account, <strong>Mia</strong>. We are thrilled to meet you!', 'sparkle', '/profile', 0, '2025-03-23 08:24:12.842', '2025-03-23 08:24:12.842'),
(6, 'NOT55675201f4444ff099e169349c9f4928', 3, 'Your Paypoints Purchase was successful, <strong>540</strong> points have been added to your balance.', 'purchase', '/wallet', 0, '2025-03-26 15:49:09.179', '2025-03-26 15:49:09.179'),
(7, 'NOTb385332ccb34494a8ac08aa4fd8ca058', 4, 'Thanks for joining us and creating an account, <strong>Mike Tyson</strong>. We are thrilled to meet you!', 'sparkle', '/profile', 0, '2025-03-26 15:50:39.513', '2025-03-26 15:50:39.513');

-- --------------------------------------------------------

--
-- Table structure for table `Order`
--

CREATE TABLE `Order` (
  `id` int(11) NOT NULL,
  `order_id` varchar(191) NOT NULL,
  `transaction_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_amount` double NOT NULL,
  `paid_status` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `OrderProduct`
--

CREATE TABLE `OrderProduct` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `status` enum('pending','processing','shipped','delivered','cancelled') NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Participants`
--

CREATE TABLE `Participants` (
  `id` int(11) NOT NULL,
  `user_1` varchar(191) NOT NULL,
  `user_2` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Participants`
--

INSERT INTO `Participants` (`id`, `user_1`, `user_2`, `created_at`, `updated_at`) VALUES
(1, 'fbab106820c84ee69a2e02e521bcae0d', '0hhc5ms5dtti', '2025-03-22 22:19:06.222', '2025-03-22 22:19:06.222'),
(2, '8eb2e4f175924697bbd97ce1dd036c57', '0hhc5ms5dtti', '2025-03-23 08:24:12.842', '2025-03-23 08:24:12.842'),
(3, '8eb2e4f175924697bbd97ce1dd036c57', 'fbab106820c84ee69a2e02e521bcae0d', '2025-03-24 11:42:53.222', '2025-03-24 11:42:53.222'),
(4, '853440530ffa495aaf686a2400e68792', '0hhc5ms5dtti', '2025-03-26 15:50:39.514', '2025-03-26 15:50:39.514'),
(5, '853440530ffa495aaf686a2400e68792', 'fbab106820c84ee69a2e02e521bcae0d', '2025-03-26 15:51:49.766', '2025-03-26 15:51:49.766');

-- --------------------------------------------------------

--
-- Table structure for table `PointConversionRate`
--

CREATE TABLE `PointConversionRate` (
  `id` int(11) NOT NULL,
  `amount` int(11) DEFAULT NULL,
  `points` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `PointConversionRateUsers`
--

CREATE TABLE `PointConversionRateUsers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `pointConversionRateId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Post`
--

CREATE TABLE `Post` (
  `id` int(11) NOT NULL,
  `post_id` varchar(191) NOT NULL,
  `was_repost` tinyint(1) NOT NULL DEFAULT 0,
  `repost_username` varchar(191) DEFAULT '',
  `repost_id` varchar(191) DEFAULT '',
  `user_id` int(11) NOT NULL,
  `content` longtext DEFAULT NULL,
  `media` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`media`)),
  `post_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `post_audience` enum('public','private','price','followers','subscribers') NOT NULL,
  `post_is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `post_likes` int(11) NOT NULL DEFAULT 0,
  `post_comments` int(11) NOT NULL DEFAULT 0,
  `post_reposts` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `post_impressions` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Post`
--

INSERT INTO `Post` (`id`, `post_id`, `was_repost`, `repost_username`, `repost_id`, `user_id`, `content`, `media`, `post_status`, `post_audience`, `post_is_visible`, `post_likes`, `post_comments`, `post_reposts`, `created_at`, `updated_at`, `post_impressions`) VALUES
(1, 'd9485325-9f06-4cf5-a366-b1876a9c8910', 0, '', '', 2, 'Hey', '[]', 'approved', 'public', 1, 2, 0, 0, '2025-03-23 00:32:43.433', '2025-03-31 13:24:11.352', 19294335),
(2, '498ce560-7f26-41cb-b25e-57a790e092be', 0, '', '', 2, 'Thanks man', '[]', 'approved', 'subscribers', 1, 2, 0, 0, '2025-03-23 00:34:15.631', '2025-03-31 16:41:12.808', 3),
(3, '5e64b8b0-27a2-44bc-bbdb-16c8b991c4a3', 0, '', '', 2, 'Hey this is a nice post', '[]', 'approved', 'price', 1, 1, 0, 0, '2025-03-23 08:52:34.665', '2025-03-31 16:41:12.703', 3),
(4, '6a627047-a48b-4be1-bddb-afca31607d93', 0, '', '', 2, 'Red Carpet Queen', '[]', 'approved', 'subscribers', 1, 2, 1, 0, '2025-03-23 09:46:54.503', '2025-03-31 16:41:10.819', 3),
(5, 'f433a9b5-ec6e-4a0f-904d-5801918b56df', 0, '', '', 2, 'Hello this is a new post', '[]', 'approved', 'price', 1, 1, 1, 1, '2025-03-23 22:51:44.065', '2025-03-31 16:41:10.698', 3),
(6, 'a14b6710-228f-4225-8986-70d29e8f62d2', 0, '', '', 2, '', '[]', 'approved', 'public', 1, 3, 20, 2, '2025-03-25 09:21:16.432', '2025-03-31 17:28:33.582', 4),
(7, 'd431b196-7dec-4425-b334-c060c60cf012', 0, '', '', 2, 'This is a new post man', '[]', 'approved', 'public', 1, 1, 2, 0, '2025-03-25 21:02:49.663', '2025-03-31 17:28:33.595', 4),
(8, 'bed65ee1-0342-4804-9f7d-6c3501449955', 0, '', '', 2, 'All in Red', '[]', 'approved', 'public', 1, 4, 1, 1, '2025-03-26 14:52:59.473', '2025-03-30 22:10:45.137', 3),
(9, '69a9da8c-87f8-47e6-96c9-047175366e8f', 0, '', '', 3, '', '[]', 'approved', 'public', 1, 1, 0, 0, '2025-03-26 16:14:24.960', '2025-03-31 13:24:14.184', 2),
(13, 'c5554524-52f4-4cff-9e0f-bf59ef508890', 0, '', '', 2, 'Thanks For this post', '[]', 'approved', 'public', 1, 1, 0, 0, '2025-03-29 18:23:10.548', '2025-03-31 19:30:51.992', 1),
(14, '19c3531a-5d18-4f14-90a1-3b03df1d8838', 0, '', '', 2, '', '[]', 'approved', 'public', 1, 1, 0, 0, '2025-03-29 18:31:19.624', '2025-03-31 19:30:53.204', 1),
(15, 'd175720b-d3a7-4ff5-add6-44b64c412b53', 0, '', '', 2, 'This is a nice post', '[]', 'approved', 'public', 1, 1, 0, 0, '2025-03-29 18:53:01.547', '2025-03-31 19:18:00.393', 1),
(18, '817cfda4-f456-4b52-b825-be392ac97b4f', 0, '', '', 2, 'Him mind go dey', '[]', 'approved', 'public', 1, 1, 0, 0, '2025-03-30 15:01:50.461', '2025-03-31 19:46:01.798', 2),
(20, '451bc7bd-c0ab-4a5a-8b61-a0405108f44d', 0, '', '', 2, 'hmm', '[]', 'approved', 'subscribers', 1, 2, 0, 0, '2025-03-30 22:01:20.904', '2025-03-31 19:35:13.896', 2);

-- --------------------------------------------------------

--
-- Table structure for table `PostComment`
--

CREATE TABLE `PostComment` (
  `id` int(11) NOT NULL,
  `comment_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `comment` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `comment_impressions` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `PostComment`
--

INSERT INTO `PostComment` (`id`, `comment_id`, `user_id`, `post_id`, `comment`, `created_at`, `updated_at`, `comment_impressions`) VALUES
(1, 'COM96b7a8a90c1349ba91be98e4a23f1151', 2, 6, 'Hey', '2025-03-25 10:12:14.633', '2025-03-25 10:12:14.633', 0),
(2, 'COM9a59d01eb2cc4441a5d38f9805f7c176', 2, 6, 'Hey new comment', '2025-03-25 10:17:36.308', '2025-03-25 10:17:36.308', 0),
(3, 'COMe1454415d4dd4ff1ace829974f7f73a3', 2, 6, 'Hey this is nice', '2025-03-25 10:21:42.949', '2025-03-25 10:21:42.949', 0),
(4, 'COM7b46aed8c8bf4f58bd5eb1943402ebd4', 2, 6, 'Hey', '2025-03-25 10:53:38.728', '2025-03-25 10:53:38.728', 0),
(5, 'COM9bb4a294df9549f0817cfe691e212142', 2, 6, 'This is ok', '2025-03-25 10:54:08.439', '2025-03-25 10:54:08.439', 0),
(6, 'COM38e510443f3b4547bb1d780f5261874e', 2, 6, 'New Comment Bro', '2025-03-25 10:55:07.794', '2025-03-25 10:55:07.794', 0),
(8, 'COM5e22435796ab42ef9d145ee828b7d3b6', 2, 6, 'OK bor', '2025-03-25 10:58:37.503', '2025-03-25 10:58:37.503', 0),
(10, 'COM95655d2bd1684a85b81c9e601bef5472', 2, 6, 'thanks', '2025-03-25 17:49:47.831', '2025-03-25 17:49:47.831', 0),
(11, 'COM1f5020b4c0c24f1a83082a591c865e64', 2, 6, 'thanks', '2025-03-25 17:50:41.398', '2025-03-25 17:50:41.398', 0),
(13, 'COMbf45239be6434aedbf6176e4948a69ee', 2, 6, 'This is another comment', '2025-03-25 17:54:52.342', '2025-03-25 17:54:52.342', 0),
(14, 'COM12eed6291a5f4a5ea69ba03b8443ebf7', 2, 6, 'thanks bro', '2025-03-25 17:58:54.571', '2025-03-25 17:58:54.571', 0),
(15, 'COM0bf971f8945949a0a560492a6dd9fc1b', 2, 6, 'thanks', '2025-03-25 18:00:57.369', '2025-03-25 18:00:57.369', 0),
(16, 'COMa5ead82ddd6a497a914871618d9b521d', 2, 6, 'thanks', '2025-03-25 18:01:53.505', '2025-03-25 18:01:53.505', 0),
(17, 'COMb41967a3727545da88658c48fd987019', 2, 6, 'ok this is nice', '2025-03-25 18:03:43.446', '2025-03-25 18:03:43.446', 0),
(18, 'COM7202e87a683d4ab6b0ec5e6ed62b2904', 2, 6, 'ok new comment', '2025-03-25 18:11:04.174', '2025-03-25 18:11:04.174', 0),
(19, 'COM718b1411d42948638169b91538694ffe', 2, 6, 'ok this is ok', '2025-03-25 18:24:27.647', '2025-03-25 18:24:27.647', 0),
(20, 'COM5c781b0020344378840985942c71c888', 2, 6, 'thanks', '2025-03-25 18:25:41.538', '2025-03-25 18:25:41.538', 0),
(21, 'COM22738016cd344100ade37fcefeeb3e33', 2, 6, 'ok', '2025-03-25 18:26:35.606', '2025-03-25 18:26:35.606', 0),
(22, 'COM5b5192d737e540bda19fdc557556a548', 2, 4, 'This is my comment', '2025-03-25 20:34:00.270', '2025-03-25 20:34:00.270', 0),
(23, 'COM4e7db159c59342c0bdb6fb4b208774fa', 2, 7, 'ok', '2025-03-25 21:05:17.672', '2025-03-25 21:05:17.672', 0),
(24, 'COMe019a06966644120a071a96089408b9a', 2, 7, 'this is a comment with an image', '2025-03-25 21:15:01.655', '2025-03-25 21:15:01.655', 0),
(25, 'COM9ea35e6bb611497e8d151c3948b4d0f4', 2, 5, 'This is a new comment', '2025-03-26 11:32:20.362', '2025-03-26 11:32:20.362', 0),
(26, 'COMc9e1bf19e2e4469cb70397fd892aecad', 3, 6, '', '2025-03-26 15:45:49.727', '2025-03-26 15:45:49.727', 0),
(27, 'COMb8a97a2860ca40c0ba53805925523702', 4, 6, 'Nice post', '2025-03-26 15:51:39.548', '2025-03-26 15:51:39.548', 0),
(28, 'COM496136a3dba343f384cda07b9f460a07', 1, 8, 'This is nice too', '2025-03-26 15:59:27.590', '2025-03-26 15:59:27.590', 0);

-- --------------------------------------------------------

--
-- Table structure for table `PostCommentAttachments`
--

CREATE TABLE `PostCommentAttachments` (
  `id` int(11) NOT NULL,
  `comment_id` int(11) NOT NULL,
  `path` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `PostCommentAttachments`
--

INSERT INTO `PostCommentAttachments` (`id`, `comment_id`, `path`, `type`, `name`, `created_at`, `updated_at`) VALUES
(1, 10, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE1b2ace6d7a354be58d389d61e173996f.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE1b2ace6d7a354be58d389d61e173996f.webp', '2025-03-25 17:49:51.232', '2025-03-25 17:49:51.232'),
(2, 10, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEa5b8f1bcbab74134be81d0fdc50648cd.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEa5b8f1bcbab74134be81d0fdc50648cd.webp', '2025-03-25 17:49:51.232', '2025-03-25 17:49:51.232'),
(3, 11, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEea97964b1dd14208b893f466f4fedc3e.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEea97964b1dd14208b893f466f4fedc3e.webp', '2025-03-25 17:50:45.216', '2025-03-25 17:50:45.216'),
(4, 11, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEf250fbdad15549a587cd9f7ebba85ab7.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEf250fbdad15549a587cd9f7ebba85ab7.webp', '2025-03-25 17:50:45.216', '2025-03-25 17:50:45.216'),
(5, 13, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE3ba1c8074e4f456190858ff0e32017e0.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE3ba1c8074e4f456190858ff0e32017e0.webp', '2025-03-25 17:54:52.353', '2025-03-25 17:54:52.353'),
(6, 13, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEce5ea232288342bda959e45cd3c85318.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEce5ea232288342bda959e45cd3c85318.webp', '2025-03-25 17:54:52.353', '2025-03-25 17:54:52.353'),
(7, 13, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE78f683e94e0b4833b99caf8a127629bb.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE78f683e94e0b4833b99caf8a127629bb.webp', '2025-03-25 17:54:52.353', '2025-03-25 17:54:52.353'),
(8, 15, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEce2a2d0e1d0a4d20ac0e49171a987fc1.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEce2a2d0e1d0a4d20ac0e49171a987fc1.webp', '2025-03-25 18:00:57.374', '2025-03-25 18:00:57.374'),
(9, 16, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEa87af93f45b5489482e00f54a82916b3.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEa87af93f45b5489482e00f54a82916b3.webp', '2025-03-25 18:01:53.602', '2025-03-25 18:01:53.602'),
(10, 17, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE6784ea363d1c4e69abec3824dca633b8.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE6784ea363d1c4e69abec3824dca633b8.webp', '2025-03-25 18:03:43.514', '2025-03-25 18:03:43.514'),
(11, 17, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE01f8a36704ce4e60b5ff8b31394abc9d.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE01f8a36704ce4e60b5ff8b31394abc9d.webp', '2025-03-25 18:03:43.514', '2025-03-25 18:03:43.514'),
(12, 18, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE16194f49b8844e75909484cf605735f6.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE16194f49b8844e75909484cf605735f6.webp', '2025-03-25 18:11:04.182', '2025-03-25 18:11:04.182'),
(13, 18, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEd064b4b27d214412b6d1eb6a386f942f.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEd064b4b27d214412b6d1eb6a386f942f.webp', '2025-03-25 18:11:04.182', '2025-03-25 18:11:04.182'),
(14, 18, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE3122629e94184b5baf27a8123442bbac.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE3122629e94184b5baf27a8123442bbac.webp', '2025-03-25 18:11:04.182', '2025-03-25 18:11:04.182'),
(15, 18, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE77a2dac07c4b40cea5e73e3eedd3c535.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE77a2dac07c4b40cea5e73e3eedd3c535.webp', '2025-03-25 18:11:04.182', '2025-03-25 18:11:04.182'),
(16, 19, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEcb988417c31447d198553cad503abb77.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEcb988417c31447d198553cad503abb77.webp', '2025-03-25 18:24:27.654', '2025-03-25 18:24:27.654'),
(17, 19, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEb9410fa926ea4df58be5972982f96113.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEb9410fa926ea4df58be5972982f96113.webp', '2025-03-25 18:24:27.654', '2025-03-25 18:24:27.654'),
(18, 21, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE457373cb888c410face314ae881444bf.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE457373cb888c410face314ae881444bf.webp', '2025-03-25 18:26:35.615', '2025-03-25 18:26:35.615'),
(19, 21, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEca2f06aa037b48a29e90430577bff956.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILEca2f06aa037b48a29e90430577bff956.webp', '2025-03-25 18:26:35.615', '2025-03-25 18:26:35.615'),
(20, 22, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE231fd7d5c0d649a89f36ff5fa4c90dda.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE231fd7d5c0d649a89f36ff5fa4c90dda.webp', '2025-03-25 20:34:00.277', '2025-03-25 20:34:00.277'),
(21, 24, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE77e8cdd6ce2f4367bb3c3b1e7e713d52.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE77e8cdd6ce2f4367bb3c3b1e7e713d52.webp', '2025-03-25 21:15:01.659', '2025-03-25 21:15:01.659'),
(22, 26, 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE561ab91405fa4b33b8edcfe8944c6548.webp', 'image', 'https://d2389neb6gppcb.cloudfront.net/comments/comments-FILE561ab91405fa4b33b8edcfe8944c6548.webp', '2025-03-26 15:45:49.736', '2025-03-26 15:45:49.736');

-- --------------------------------------------------------

--
-- Table structure for table `PostCommentLikes`
--

CREATE TABLE `PostCommentLikes` (
  `id` int(11) NOT NULL,
  `like_id` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `PostImpression`
--

CREATE TABLE `PostImpression` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `PostImpression`
--

INSERT INTO `PostImpression` (`id`, `post_id`, `user_id`, `created_at`, `updated_at`) VALUES
(23, 20, 2, '2025-03-30 22:10:41.957', '2025-03-30 22:10:41.957'),
(24, 18, 2, '2025-03-30 22:10:43.091', '2025-03-30 22:10:43.091'),
(25, 15, 2, '2025-03-30 22:10:43.357', '2025-03-30 22:10:43.357'),
(26, 14, 2, '2025-03-30 22:10:44.088', '2025-03-30 22:10:44.088'),
(27, 13, 2, '2025-03-30 22:10:44.502', '2025-03-30 22:10:44.502'),
(28, 8, 2, '2025-03-30 22:10:45.131', '2025-03-30 22:10:45.131'),
(29, 7, 2, '2025-03-30 22:10:45.439', '2025-03-30 22:10:45.439'),
(30, 6, 2, '2025-03-30 22:10:45.839', '2025-03-30 22:10:45.839'),
(31, 1, 2, '2025-03-31 13:24:11.342', '2025-03-31 13:24:11.342'),
(32, 9, 2, '2025-03-31 13:24:14.180', '2025-03-31 13:24:14.180'),
(33, 5, 2, '2025-03-31 16:41:10.693', '2025-03-31 16:41:10.693'),
(34, 4, 2, '2025-03-31 16:41:10.816', '2025-03-31 16:41:10.816'),
(35, 3, 2, '2025-03-31 16:41:12.701', '2025-03-31 16:41:12.701'),
(36, 2, 2, '2025-03-31 16:41:12.805', '2025-03-31 16:41:12.805'),
(37, 6, 4, '2025-03-31 17:28:33.579', '2025-03-31 17:28:33.579'),
(38, 7, 4, '2025-03-31 17:28:33.592', '2025-03-31 17:28:33.592'),
(39, 20, 4, '2025-03-31 19:34:24.185', '2025-03-31 19:34:24.185'),
(40, 18, 4, '2025-03-31 19:46:01.792', '2025-03-31 19:46:01.792');

-- --------------------------------------------------------

--
-- Table structure for table `PostLike`
--

CREATE TABLE `PostLike` (
  `id` int(11) NOT NULL,
  `like_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `PostLike`
--

INSERT INTO `PostLike` (`id`, `like_id`, `user_id`, `post_id`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 2, '2025-03-23 00:34:51.249', '2025-03-23 00:34:51.249'),
(2, 1, 2, 1, '2025-03-23 07:51:08.511', '2025-03-23 07:51:08.511'),
(3, 1, 3, 2, '2025-03-23 08:35:07.725', '2025-03-23 08:35:07.725'),
(4, 1, 2, 3, '2025-03-23 08:52:43.231', '2025-03-23 08:52:43.231'),
(5, 1, 3, 4, '2025-03-23 10:07:54.812', '2025-03-23 10:07:54.812'),
(6, 1, 2, 4, '2025-03-23 10:08:10.413', '2025-03-23 10:08:10.413'),
(7, 1, 3, 5, '2025-03-24 12:41:51.863', '2025-03-24 12:41:51.863'),
(9, 1, 2, 7, '2025-03-25 21:05:13.043', '2025-03-25 21:05:13.043'),
(10, 1, 3, 1, '2025-03-26 14:54:39.932', '2025-03-26 14:54:39.932'),
(11, 1, 3, 6, '2025-03-26 14:54:41.177', '2025-03-26 14:54:41.177'),
(13, 1, 2, 8, '2025-03-26 15:39:31.191', '2025-03-26 15:39:31.191'),
(14, 1, 4, 8, '2025-03-26 15:50:50.239', '2025-03-26 15:50:50.239'),
(15, 1, 4, 6, '2025-03-26 15:51:46.737', '2025-03-26 15:51:46.737'),
(16, 1, 1, 8, '2025-03-26 15:59:17.865', '2025-03-26 15:59:17.865'),
(36, 1, 2, 6, '2025-03-28 16:46:14.804', '2025-03-28 16:46:14.804'),
(37, 1, 3, 8, '2025-03-29 01:20:45.997', '2025-03-29 01:20:45.997'),
(38, 1, 3, 9, '2025-03-29 01:22:43.195', '2025-03-29 01:22:43.195'),
(39, 1, 2, 20, '2025-03-30 22:07:37.769', '2025-03-30 22:07:37.769'),
(41, 1, 2, 15, '2025-03-31 19:18:00.387', '2025-03-31 19:18:00.387'),
(42, 1, 2, 13, '2025-03-31 19:30:51.989', '2025-03-31 19:30:51.989'),
(43, 1, 2, 14, '2025-03-31 19:30:53.201', '2025-03-31 19:30:53.201'),
(44, 1, 2, 18, '2025-03-31 19:30:55.266', '2025-03-31 19:30:55.266'),
(45, 1, 4, 20, '2025-03-31 19:35:13.892', '2025-03-31 19:35:13.892');

-- --------------------------------------------------------

--
-- Table structure for table `PostShared`
--

CREATE TABLE `PostShared` (
  `id` int(11) NOT NULL,
  `shared_id` varchar(191) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `post_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Product`
--

CREATE TABLE `Product` (
  `id` int(11) NOT NULL,
  `product_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` longtext DEFAULT NULL,
  `price` double NOT NULL,
  `category_id` int(11) NOT NULL,
  `instock` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Product`
--

INSERT INTO `Product` (`id`, `product_id`, `user_id`, `name`, `description`, `price`, `category_id`, `instock`) VALUES
(1, '67e6e12338fab', 1, 'New Red Ninja Shirt', 'New Red Ninja Shirt', 50000, 1, 300);

-- --------------------------------------------------------

--
-- Table structure for table `ProductCategory`
--

CREATE TABLE `ProductCategory` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ProductCategory`
--

INSERT INTO `ProductCategory` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'Clothes', NULL, '2025-03-28 13:48:22.005'),
(2, 'Hats', NULL, '2025-03-28 13:48:42.607');

-- --------------------------------------------------------

--
-- Table structure for table `ProductImages`
--

CREATE TABLE `ProductImages` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `image_url` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ProductImages`
--

INSERT INTO `ProductImages` (`id`, `product_id`, `image_url`, `created_at`, `updated_at`) VALUES
(1, 1, 'https://res.cloudinary.com/dafftcpbr/image/upload/v1743184297/store/products/fchobrjbfaxvgmhl9i68.jpg', '2025-03-28 17:51:39.000', '2025-03-28 17:51:39.000');

-- --------------------------------------------------------

--
-- Table structure for table `ProductSize`
--

CREATE TABLE `ProductSize` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` longtext DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ProductSize`
--

INSERT INTO `ProductSize` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'S', NULL, '2025-03-28 13:46:37.160'),
(2, 'M', NULL, '2025-03-28 13:46:49.892'),
(3, 'L', NULL, '2025-03-28 13:47:03.381'),
(4, 'XL', NULL, '2025-03-28 13:47:16.833');

-- --------------------------------------------------------

--
-- Table structure for table `ProductSizePivot`
--

CREATE TABLE `ProductSizePivot` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `size_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ProductSizePivot`
--

INSERT INTO `ProductSizePivot` (`id`, `product_id`, `size_id`, `created_at`, `updated_at`) VALUES
(1, 1, 2, '2025-03-28 17:51:39.000', '2025-03-28 17:51:39.000'),
(2, 1, 1, '2025-03-28 17:51:39.000', '2025-03-28 17:51:39.000'),
(3, 1, 3, '2025-03-28 17:51:39.000', '2025-03-28 17:51:39.000');

-- --------------------------------------------------------

--
-- Table structure for table `ReportComment`
--

CREATE TABLE `ReportComment` (
  `id` int(11) NOT NULL,
  `report_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment_id` int(11) NOT NULL,
  `report_type` varchar(191) NOT NULL,
  `report` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ReportLive`
--

CREATE TABLE `ReportLive` (
  `id` int(11) NOT NULL,
  `report_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `live_id` int(11) NOT NULL,
  `report_type` varchar(191) NOT NULL,
  `report` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ReportMessage`
--

CREATE TABLE `ReportMessage` (
  `id` int(11) NOT NULL,
  `report_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `report_type` varchar(191) NOT NULL,
  `report` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ReportPost`
--

CREATE TABLE `ReportPost` (
  `id` int(11) NOT NULL,
  `report_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `report_type` varchar(191) NOT NULL,
  `report` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ReportUser`
--

CREATE TABLE `ReportUser` (
  `id` int(11) NOT NULL,
  `report_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reported_id` varchar(191) NOT NULL,
  `report_type` varchar(191) NOT NULL,
  `report` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Settings`
--

CREATE TABLE `Settings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `price_per_message` double NOT NULL,
  `subscription_active` tinyint(1) NOT NULL DEFAULT 0,
  `enable_free_message` tinyint(1) NOT NULL,
  `subscription_price` double NOT NULL,
  `subscription_type` varchar(191) NOT NULL,
  `subscription_duration` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Settings`
--

INSERT INTO `Settings` (`id`, `user_id`, `price_per_message`, `subscription_active`, `enable_free_message`, `subscription_price`, `subscription_type`, `subscription_duration`, `created_at`, `updated_at`) VALUES
(1, 1, 0, 0, 1, 0, 'free', '1 Month', '2025-03-22 22:11:52.984', '2025-03-22 22:11:52.984'),
(2, 2, 800, 0, 1, 0, 'free', '1 month', '2025-03-22 22:19:06.165', '2025-03-26 15:53:12.474'),
(3, 3, 0, 0, 1, 0, 'free', '1 month', '2025-03-23 08:24:12.807', '2025-03-23 08:24:12.807'),
(4, 4, 0, 0, 1, 0, 'free', '1 month', '2025-03-26 15:50:39.465', '2025-03-26 15:50:39.465');

-- --------------------------------------------------------

--
-- Table structure for table `StoryMedia`
--

CREATE TABLE `StoryMedia` (
  `id` int(11) NOT NULL,
  `media_id` varchar(191) NOT NULL,
  `media_type` varchar(191) NOT NULL,
  `filename` varchar(191) NOT NULL,
  `captionStyle` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`captionStyle`)),
  `story_content` longtext DEFAULT NULL,
  `url` longtext NOT NULL,
  `duration` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `StoryMedia`
--

INSERT INTO `StoryMedia` (`id`, `media_id`, `media_type`, `filename`, `captionStyle`, `story_content`, `url`, `duration`, `user_id`, `created_at`, `updated_at`) VALUES
(1, 'MED173b1e00ccc34a558272ac5b80c597f3', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9c9c2d7f-7588-4af5-ebad-cc703da41400/public', NULL, NULL, 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9c9c2d7f-7588-4af5-ebad-cc703da41400/public', 5000, 1, '2025-03-27 17:02:27.339', '2025-03-27 17:02:27.339'),
(2, 'MEDfcbfdfe3c059449597aaab4f0b6d2bbe', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/baae1778-2d10-417a-2784-b009b4c0f900/public', NULL, NULL, 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/baae1778-2d10-417a-2784-b009b4c0f900/public', 5000, 1, '2025-03-27 17:02:27.339', '2025-03-27 17:02:27.339'),
(3, 'MED9479fe418dc34ee0984334b08fa234f8', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/73377848-a9ea-4162-5575-806002e4a800/public', NULL, NULL, 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/73377848-a9ea-4162-5575-806002e4a800/public', 5000, 1, '2025-03-27 17:02:27.339', '2025-03-27 17:02:27.339'),
(4, 'MED9f0ec09ef1ff40559ba818931a9204ee', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b4bcc8f0-45d3-4b6a-f94e-8006047ff600/public', NULL, 'This is a new caption', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b4bcc8f0-45d3-4b6a-f94e-8006047ff600/public', 5000, 2, '2025-03-27 17:04:46.650', '2025-03-27 17:04:46.650'),
(5, 'MED48aba9b54df645d1b21f12ef58e92f17', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/3920204d-1864-476c-b8be-56493106b600/public', NULL, 'City Town', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/3920204d-1864-476c-b8be-56493106b600/public', 5000, 2, '2025-03-27 17:04:46.650', '2025-03-27 17:04:46.650'),
(6, 'MED5035e60b0eae4dfda4099cd527e4fc94', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2a76e51e-3c39-4e46-839e-f8db21833800/public', NULL, NULL, 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2a76e51e-3c39-4e46-839e-f8db21833800/public', 5000, 3, '2025-03-27 17:26:33.975', '2025-03-27 17:26:33.975'),
(7, 'MED0f8688b209134242843ed3aeeb1e081c', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/bcb34757-492d-4eda-7287-db082da4b500/public', NULL, NULL, 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/bcb34757-492d-4eda-7287-db082da4b500/public', 5000, 3, '2025-03-27 17:26:33.975', '2025-03-27 17:26:33.975'),
(8, 'MED2fd4a470366f49eeb283ebe5770f5f3e', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/05894bfe-ebd0-490e-2c9f-562632599600/public', NULL, NULL, 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/05894bfe-ebd0-490e-2c9f-562632599600/public', 5000, 3, '2025-03-27 17:26:33.975', '2025-03-27 17:26:33.975'),
(9, 'MED7400bd3b8a934b59983af3297df1a63a', 'image', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/64799393-a7ee-4755-bb9b-3895e02d4900/public', NULL, NULL, 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/64799393-a7ee-4755-bb9b-3895e02d4900/public', 5000, 3, '2025-03-27 17:26:33.975', '2025-03-27 17:26:33.975');

-- --------------------------------------------------------

--
-- Table structure for table `Subscribers`
--

CREATE TABLE `Subscribers` (
  `id` int(11) NOT NULL,
  `sub_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subscriber_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `User`
--

CREATE TABLE `User` (
  `id` int(11) NOT NULL,
  `email` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `password` varchar(191) NOT NULL,
  `fullname` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `username` varchar(191) NOT NULL,
  `admin` tinyint(1) NOT NULL DEFAULT 0,
  `role` enum('fan','model','admin') NOT NULL DEFAULT 'fan',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_model` tinyint(1) NOT NULL DEFAULT 0,
  `email_verify_code` varchar(191) DEFAULT NULL,
  `email_verify_time` datetime(3) DEFAULT NULL,
  `is_phone_verified` tinyint(1) NOT NULL DEFAULT 0,
  `phone` varchar(191) NOT NULL,
  `profile_image` varchar(191) DEFAULT '/site/avatar.png',
  `profile_banner` varchar(191) DEFAULT '/site/banner.png',
  `bio` text DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `website` varchar(191) DEFAULT NULL,
  `country` varchar(191) DEFAULT NULL,
  `state` varchar(191) DEFAULT NULL,
  `city` varchar(191) DEFAULT NULL,
  `zip` varchar(191) DEFAULT NULL,
  `post_watermark` varchar(191) DEFAULT NULL,
  `total_followers` int(11) NOT NULL DEFAULT 0,
  `total_following` int(11) NOT NULL DEFAULT 0,
  `total_subscribers` int(11) NOT NULL DEFAULT 0,
  `admin_status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `User`
--

INSERT INTO `User` (`id`, `email`, `name`, `password`, `fullname`, `user_id`, `username`, `admin`, `role`, `is_active`, `is_verified`, `is_email_verified`, `is_model`, `email_verify_code`, `email_verify_time`, `is_phone_verified`, `phone`, `profile_image`, `profile_banner`, `bio`, `location`, `website`, `country`, `state`, `city`, `zip`, `post_watermark`, `total_followers`, `total_following`, `total_subscribers`, `admin_status`, `created_at`, `updated_at`) VALUES
(1, 'admin@paymefans.com', 'Paymefans', '$2b$12$27PtQ1SDfFomJYW2z.JyxumciGt67NNo7DVFl3UPfQiMfr1RtUnn.', 'Paymefans', '0hhc5ms5dtti', '@paymefans', 1, 'admin', 1, 0, 0, 0, NULL, NULL, 0, '1234567890', 'https://d2389neb6gppcb.cloudfront.net/avatars/avatars-FILE0b3e95a7d57f488a99841d9732a2bcee.webp', '/site/banner.png', NULL, 'Nigeria', NULL, NULL, NULL, NULL, NULL, NULL, 3, 0, 0, 1, '2025-03-22 22:11:52.984', '2025-03-26 16:00:26.889'),
(2, 'dikewisdom787@gmail.com', 'Dike Wisdom', '$2b$12$npfX/3Dcbo0tg4uxfNmFieKBeLEkHVroTVrvhgwjNOAfvXh.TPuii', 'Dike Wisdom', 'fbab106820c84ee69a2e02e521bcae0d', '@dikewisdom', 0, 'fan', 1, 0, 0, 1, NULL, NULL, 0, '09088227722', 'https://d2389neb6gppcb.cloudfront.net/avatars/avatars-FILE97bb250d359343558c48c419814ea5c7.webp', 'https://d2389neb6gppcb.cloudfront.net/banners/banners-FILEfe41287389074ebeaf8b3b27c8a84c4f.webp', '✨ Living life one day at a time\r\n🌍 Exploring the world\r\n📸 Capturing moments\r\n💬 DM for collabs', 'Myanmar', 'https://redis.io/pricing/', NULL, NULL, NULL, NULL, NULL, 1, 0, 0, 1, '2025-03-22 22:19:06.165', '2025-03-29 01:21:30.475'),
(3, 'mia112@test.com', 'Mayson Monroe', '$2b$12$loRvjx83hhe1ZfML4yOIgu3vpj9sjF49hf/HbqmWWTpNHpJZWBXo2', 'Mia', '8eb2e4f175924697bbd97ce1dd036c57', '@miatest1', 0, 'fan', 1, 0, 0, 0, NULL, NULL, 0, '09022883377', 'https://d2389neb6gppcb.cloudfront.net/avatars/avatars-FILE3168cd1086b4445095ce3062d54b8d7c.webp', 'https://d2389neb6gppcb.cloudfront.net/banners/banners-FILEc13865d06e4f45c18aa4ea9faff4ceae.webp', NULL, 'Nigeria', NULL, NULL, NULL, NULL, NULL, NULL, 0, 1, 0, 1, '2025-03-23 08:24:12.807', '2025-03-29 01:21:30.491'),
(4, 'dikewisdom778@gmail.com', 'Mike Tyson', '$2b$12$npfX/3Dcbo0tg4uxfNmFieKBeLEkHVroTVrvhgwjNOAfvXh.TPuii', 'Mike Tyson', '853440530ffa495aaf686a2400e68792', '@miketyson', 0, 'fan', 1, 0, 0, 1, NULL, NULL, 0, '08058184691', 'https://d2389neb6gppcb.cloudfront.net/avatars/avatars-FILE9ab4253d214f40cdac076cb61a1dd41f.webp', 'https://d2389neb6gppcb.cloudfront.net/banners/banners-FILEe123081ee091474aade218cbc718f3d4.webp', NULL, 'Afghanistan', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 1, '2025-03-26 15:50:39.465', '2025-03-31 17:32:45.071');

-- --------------------------------------------------------

--
-- Table structure for table `UserAttachments`
--

CREATE TABLE `UserAttachments` (
  `id` int(11) NOT NULL,
  `path` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `size` int(11) NOT NULL,
  `extension` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `UserBanks`
--

CREATE TABLE `UserBanks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bank_id` varchar(191) NOT NULL,
  `bank_name` varchar(191) NOT NULL,
  `account_name` varchar(191) NOT NULL,
  `account_number` varchar(191) NOT NULL,
  `routing_number` varchar(191) DEFAULT NULL,
  `swift_code` varchar(191) DEFAULT NULL,
  `bank_country` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `UserBanks`
--

INSERT INTO `UserBanks` (`id`, `user_id`, `bank_id`, `bank_name`, `account_name`, `account_number`, `routing_number`, `swift_code`, `bank_country`, `created_at`, `updated_at`) VALUES
(1, 2, '50515', 'Moniepoint MFB', 'WISDOM ULUEBUBE DIKE', '8058184691', NULL, NULL, 'Nigeria', '2025-03-26 15:43:36.982', '2025-03-26 15:43:36.982');

-- --------------------------------------------------------

--
-- Table structure for table `UserMedia`
--

CREATE TABLE `UserMedia` (
  `id` int(11) NOT NULL,
  `media_id` varchar(191) NOT NULL,
  `post_id` int(11) NOT NULL,
  `media_type` varchar(191) NOT NULL,
  `media_state` enum('processing','completed') NOT NULL DEFAULT 'processing',
  `duration` varchar(191) DEFAULT '',
  `url` longtext NOT NULL,
  `blur` longtext NOT NULL,
  `poster` longtext NOT NULL,
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `accessible_to` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `UserMedia`
--

INSERT INTO `UserMedia` (`id`, `media_id`, `post_id`, `media_type`, `media_state`, `duration`, `url`, `blur`, `poster`, `locked`, `accessible_to`, `created_at`, `updated_at`) VALUES
(1, '2a76e51e-3c39-4e46-839e-f8db21833800', 3, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2a76e51e-3c39-4e46-839e-f8db21833800/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2a76e51e-3c39-4e46-839e-f8db21833800/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2a76e51e-3c39-4e46-839e-f8db21833800/public', 0, 'price', '2025-03-23 08:52:34.665', '2025-03-23 09:12:47.591'),
(2, '8c45ecd8-b2bb-4fcf-7c2f-3f5d691c7900', 3, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/8c45ecd8-b2bb-4fcf-7c2f-3f5d691c7900/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/8c45ecd8-b2bb-4fcf-7c2f-3f5d691c7900/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/8c45ecd8-b2bb-4fcf-7c2f-3f5d691c7900/public', 0, 'price', '2025-03-23 08:52:34.665', '2025-03-23 09:12:47.591'),
(3, '663a197d-31e3-43c0-16f3-8f03cc42c300', 3, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/663a197d-31e3-43c0-16f3-8f03cc42c300/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/663a197d-31e3-43c0-16f3-8f03cc42c300/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/663a197d-31e3-43c0-16f3-8f03cc42c300/public', 0, 'price', '2025-03-23 08:52:34.665', '2025-03-23 09:12:47.591'),
(4, '0be62cc5-2d8a-4a18-f688-7ef4a5d70300', 3, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0be62cc5-2d8a-4a18-f688-7ef4a5d70300/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0be62cc5-2d8a-4a18-f688-7ef4a5d70300/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0be62cc5-2d8a-4a18-f688-7ef4a5d70300/public', 0, 'price', '2025-03-23 08:52:34.665', '2025-03-23 09:12:47.591'),
(5, '0e41671a-241a-4da3-5240-13bdf8baf900', 4, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0e41671a-241a-4da3-5240-13bdf8baf900/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0e41671a-241a-4da3-5240-13bdf8baf900/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0e41671a-241a-4da3-5240-13bdf8baf900/public', 0, 'subscribers', '2025-03-23 09:46:54.503', '2025-03-23 10:06:46.401'),
(6, '05894bfe-ebd0-490e-2c9f-562632599600', 4, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/05894bfe-ebd0-490e-2c9f-562632599600/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/05894bfe-ebd0-490e-2c9f-562632599600/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/05894bfe-ebd0-490e-2c9f-562632599600/public', 0, 'subscribers', '2025-03-23 09:46:54.503', '2025-03-23 10:06:46.401'),
(7, '2a6bfa3d-7b66-4e57-7a07-341985e9fb00', 4, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2a6bfa3d-7b66-4e57-7a07-341985e9fb00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2a6bfa3d-7b66-4e57-7a07-341985e9fb00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2a6bfa3d-7b66-4e57-7a07-341985e9fb00/public', 0, 'subscribers', '2025-03-23 09:46:54.503', '2025-03-23 10:06:46.401'),
(8, 'cbe829c0-a8fa-4e0a-7b6a-4a38cf571d00', 4, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/cbe829c0-a8fa-4e0a-7b6a-4a38cf571d00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/cbe829c0-a8fa-4e0a-7b6a-4a38cf571d00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/cbe829c0-a8fa-4e0a-7b6a-4a38cf571d00/public', 0, 'subscribers', '2025-03-23 09:46:54.503', '2025-03-23 10:06:46.401'),
(9, 'beb1d856-acf7-46a6-9ad9-93eebcbf4000', 4, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/beb1d856-acf7-46a6-9ad9-93eebcbf4000/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/beb1d856-acf7-46a6-9ad9-93eebcbf4000/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/beb1d856-acf7-46a6-9ad9-93eebcbf4000/public', 0, 'subscribers', '2025-03-23 09:46:54.503', '2025-03-23 10:06:46.401'),
(10, 'bcb34757-492d-4eda-7287-db082da4b500', 4, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/bcb34757-492d-4eda-7287-db082da4b500/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/bcb34757-492d-4eda-7287-db082da4b500/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/bcb34757-492d-4eda-7287-db082da4b500/public', 0, 'subscribers', '2025-03-23 09:46:54.503', '2025-03-23 10:06:46.401'),
(11, 'b7843f28-5f55-412b-76e8-e85656b17c00', 5, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b7843f28-5f55-412b-76e8-e85656b17c00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b7843f28-5f55-412b-76e8-e85656b17c00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b7843f28-5f55-412b-76e8-e85656b17c00/public', 0, 'price', '2025-03-23 22:51:44.065', '2025-03-23 22:51:44.065'),
(12, '1d7168e7-6122-43f4-dade-5acc3e15fb00', 5, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d7168e7-6122-43f4-dade-5acc3e15fb00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d7168e7-6122-43f4-dade-5acc3e15fb00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d7168e7-6122-43f4-dade-5acc3e15fb00/public', 0, 'price', '2025-03-23 22:51:44.065', '2025-03-23 22:51:44.065'),
(13, '9f187468-c4e1-4970-b556-4c55ce265d00', 5, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9f187468-c4e1-4970-b556-4c55ce265d00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9f187468-c4e1-4970-b556-4c55ce265d00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9f187468-c4e1-4970-b556-4c55ce265d00/public', 0, 'price', '2025-03-23 22:51:44.065', '2025-03-23 22:51:44.065'),
(14, 'ef7f964d-ad56-47cc-2bef-2ccdd0108e00', 5, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/ef7f964d-ad56-47cc-2bef-2ccdd0108e00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/ef7f964d-ad56-47cc-2bef-2ccdd0108e00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/ef7f964d-ad56-47cc-2bef-2ccdd0108e00/public', 0, 'price', '2025-03-23 22:51:44.065', '2025-03-23 22:51:44.065'),
(15, '76687ec0-1f76-4428-de8a-abbe0529d900', 5, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/76687ec0-1f76-4428-de8a-abbe0529d900/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/76687ec0-1f76-4428-de8a-abbe0529d900/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/76687ec0-1f76-4428-de8a-abbe0529d900/public', 0, 'price', '2025-03-23 22:51:44.065', '2025-03-23 22:51:44.065'),
(16, 'f1892b62-dfe9-4c16-0360-33181263cb00', 5, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/f1892b62-dfe9-4c16-0360-33181263cb00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/f1892b62-dfe9-4c16-0360-33181263cb00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/f1892b62-dfe9-4c16-0360-33181263cb00/public', 0, 'price', '2025-03-23 22:51:44.065', '2025-03-23 22:51:44.065'),
(17, '1d9e3c24-9ea7-45fc-f9bd-b15134f5f300', 5, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d9e3c24-9ea7-45fc-f9bd-b15134f5f300/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d9e3c24-9ea7-45fc-f9bd-b15134f5f300/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d9e3c24-9ea7-45fc-f9bd-b15134f5f300/public', 0, 'price', '2025-03-23 22:51:44.065', '2025-03-23 22:51:44.065'),
(18, 'b34222a9-d706-4cd8-ee85-016fc3c71e00', 5, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b34222a9-d706-4cd8-ee85-016fc3c71e00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b34222a9-d706-4cd8-ee85-016fc3c71e00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b34222a9-d706-4cd8-ee85-016fc3c71e00/public', 0, 'price', '2025-03-23 22:51:44.065', '2025-03-23 22:51:44.065'),
(19, '239c9ecb-112e-49d8-1a86-92a28de98500', 6, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/239c9ecb-112e-49d8-1a86-92a28de98500/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/239c9ecb-112e-49d8-1a86-92a28de98500/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/239c9ecb-112e-49d8-1a86-92a28de98500/public', 0, 'public', '2025-03-25 09:21:16.432', '2025-03-25 09:21:16.432'),
(20, '7e767471-6511-46a8-4caf-546d5e30aa00', 6, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/7e767471-6511-46a8-4caf-546d5e30aa00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/7e767471-6511-46a8-4caf-546d5e30aa00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/7e767471-6511-46a8-4caf-546d5e30aa00/public', 0, 'public', '2025-03-25 09:21:16.432', '2025-03-25 09:21:16.432'),
(21, '71b7de73-4115-4f92-fbce-de7da8b65200', 6, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/71b7de73-4115-4f92-fbce-de7da8b65200/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/71b7de73-4115-4f92-fbce-de7da8b65200/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/71b7de73-4115-4f92-fbce-de7da8b65200/public', 0, 'public', '2025-03-25 09:21:16.432', '2025-03-25 09:21:16.432'),
(22, '64799393-a7ee-4755-bb9b-3895e02d4900', 6, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/64799393-a7ee-4755-bb9b-3895e02d4900/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/64799393-a7ee-4755-bb9b-3895e02d4900/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/64799393-a7ee-4755-bb9b-3895e02d4900/public', 0, 'public', '2025-03-25 09:21:16.432', '2025-03-25 09:21:16.432'),
(23, '1d01bd20-25a2-433a-1713-81e3f8038f00', 6, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d01bd20-25a2-433a-1713-81e3f8038f00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d01bd20-25a2-433a-1713-81e3f8038f00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/1d01bd20-25a2-433a-1713-81e3f8038f00/public', 0, 'public', '2025-03-25 09:21:16.432', '2025-03-25 09:21:16.432'),
(24, '2885f503-be52-4d3d-32e7-c58654254800', 6, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2885f503-be52-4d3d-32e7-c58654254800/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2885f503-be52-4d3d-32e7-c58654254800/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/2885f503-be52-4d3d-32e7-c58654254800/public', 0, 'public', '2025-03-25 09:21:16.432', '2025-03-25 09:21:16.432'),
(25, '4b72a722-be1b-4e9c-b2c8-b0f3fb438400', 7, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/4b72a722-be1b-4e9c-b2c8-b0f3fb438400/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/4b72a722-be1b-4e9c-b2c8-b0f3fb438400/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/4b72a722-be1b-4e9c-b2c8-b0f3fb438400/public', 0, 'public', '2025-03-25 21:02:49.663', '2025-03-25 21:02:49.663'),
(26, '9ded5353-ffcd-4825-e80a-6cbfa9af4e00', 7, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9ded5353-ffcd-4825-e80a-6cbfa9af4e00/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9ded5353-ffcd-4825-e80a-6cbfa9af4e00/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9ded5353-ffcd-4825-e80a-6cbfa9af4e00/public', 0, 'public', '2025-03-25 21:02:49.663', '2025-03-25 21:02:49.663'),
(27, 'baae1778-2d10-417a-2784-b009b4c0f900', 7, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/baae1778-2d10-417a-2784-b009b4c0f900/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/baae1778-2d10-417a-2784-b009b4c0f900/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/baae1778-2d10-417a-2784-b009b4c0f900/public', 0, 'public', '2025-03-25 21:02:49.663', '2025-03-25 21:02:49.663'),
(28, 'b4bcc8f0-45d3-4b6a-f94e-8006047ff600', 7, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b4bcc8f0-45d3-4b6a-f94e-8006047ff600/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b4bcc8f0-45d3-4b6a-f94e-8006047ff600/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b4bcc8f0-45d3-4b6a-f94e-8006047ff600/public', 0, 'public', '2025-03-25 21:02:49.663', '2025-03-25 21:02:49.663'),
(29, '3920204d-1864-476c-b8be-56493106b600', 7, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/3920204d-1864-476c-b8be-56493106b600/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/3920204d-1864-476c-b8be-56493106b600/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/3920204d-1864-476c-b8be-56493106b600/public', 0, 'public', '2025-03-25 21:02:49.663', '2025-03-25 21:02:49.663'),
(30, '5d926e01-0b14-4106-4c43-38a195587900', 7, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/5d926e01-0b14-4106-4c43-38a195587900/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/5d926e01-0b14-4106-4c43-38a195587900/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/5d926e01-0b14-4106-4c43-38a195587900/public', 0, 'public', '2025-03-25 21:02:49.663', '2025-03-25 21:02:49.663'),
(31, '7cd574bc-7566-4fad-1f62-b9cb6594d600', 7, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/7cd574bc-7566-4fad-1f62-b9cb6594d600/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/7cd574bc-7566-4fad-1f62-b9cb6594d600/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/7cd574bc-7566-4fad-1f62-b9cb6594d600/public', 0, 'public', '2025-03-25 21:02:49.663', '2025-03-25 21:02:49.663'),
(32, 'f59fe6cc-1f1d-420c-cb2f-1e69d4236500', 7, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/f59fe6cc-1f1d-420c-cb2f-1e69d4236500/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/f59fe6cc-1f1d-420c-cb2f-1e69d4236500/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/f59fe6cc-1f1d-420c-cb2f-1e69d4236500/public', 0, 'public', '2025-03-25 21:02:49.663', '2025-03-25 21:02:49.663'),
(33, '9c9c2d7f-7588-4af5-ebad-cc703da41400', 8, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9c9c2d7f-7588-4af5-ebad-cc703da41400/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9c9c2d7f-7588-4af5-ebad-cc703da41400/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/9c9c2d7f-7588-4af5-ebad-cc703da41400/public', 1, 'public', '2025-03-26 14:52:59.473', '2025-03-26 15:36:14.541'),
(34, 'b70dd439-519c-456d-d124-1d7d1f867200', 8, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b70dd439-519c-456d-d124-1d7d1f867200/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b70dd439-519c-456d-d124-1d7d1f867200/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/b70dd439-519c-456d-d124-1d7d1f867200/public', 1, 'public', '2025-03-26 14:52:59.473', '2025-03-26 15:36:14.541'),
(35, '0a07aa8d-e350-41e4-3b9f-09bd003aa500', 8, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0a07aa8d-e350-41e4-3b9f-09bd003aa500/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0a07aa8d-e350-41e4-3b9f-09bd003aa500/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/0a07aa8d-e350-41e4-3b9f-09bd003aa500/public', 1, 'public', '2025-03-26 14:52:59.473', '2025-03-26 15:36:14.541'),
(36, '73377848-a9ea-4162-5575-806002e4a800', 8, 'image', 'completed', '', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/73377848-a9ea-4162-5575-806002e4a800/public', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/73377848-a9ea-4162-5575-806002e4a800/blured', 'https://imagedelivery.net/BkWt18zgTlMSMWqDXzwqGw/73377848-a9ea-4162-5575-806002e4a800/public', 1, 'public', '2025-03-26 14:52:59.473', '2025-03-26 15:36:14.541'),
(37, '4f3fb30dda6aae85822a183d78ed9292', 9, 'video', 'completed', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/4f3fb30dda6aae85822a183d78ed9292/manifest/video.m3u8', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/0f787f29fbff474fc41d4dc36b3fb39f/thumbnails/thumbnail.jpg', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/4f3fb30dda6aae85822a183d78ed9292/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-26 16:14:24.960', '2025-03-26 16:14:24.960'),
(38, '0f787f29fbff474fc41d4dc36b3fb39f', 9, 'video', 'completed', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/0f787f29fbff474fc41d4dc36b3fb39f/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/4f3fb30dda6aae85822a183d78ed9292/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-26 16:14:24.960', '2025-03-26 16:14:24.960'),
(49, 'bc03a8e87ec81b44967b19f1631a0f5e', 13, 'video', 'completed', '8.64', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/bc03a8e87ec81b44967b19f1631a0f5e/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/bc03a8e87ec81b44967b19f1631a0f5e/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-29 18:23:10.548', '2025-03-29 18:23:12.292'),
(50, 'acdf68ce61fc5d5d921842bd645e42e0', 13, 'video', 'completed', '7.51', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/acdf68ce61fc5d5d921842bd645e42e0/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/acdf68ce61fc5d5d921842bd645e42e0/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-29 18:23:10.548', '2025-03-29 18:23:26.727'),
(51, '0c5f8b877a6b4f2382d70aeda3008ce3', 14, 'video', 'completed', '8.64', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/0c5f8b877a6b4f2382d70aeda3008ce3/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/0c5f8b877a6b4f2382d70aeda3008ce3/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-29 18:31:19.624', '2025-03-29 18:31:33.637'),
(52, '1e101e42367ff5616189618350b69c67', 15, 'video', 'completed', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/1e101e42367ff5616189618350b69c67/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/1e101e42367ff5616189618350b69c67/manifest/video.m3u8', 0, 'public', '2025-03-29 18:53:01.547', '2025-03-29 18:53:01.547'),
(53, '8fc6fe98403178ece9fe37ba13ea138f', 15, 'video', 'completed', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/8fc6fe98403178ece9fe37ba13ea138f/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/8fc6fe98403178ece9fe37ba13ea138f/manifest/video.m3u8', 0, 'public', '2025-03-29 18:53:01.547', '2025-03-29 18:53:01.547'),
(54, 'a8d26efe907cd33c445f60d7c1620b53', 15, 'video', 'completed', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/a8d26efe907cd33c445f60d7c1620b53/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/a8d26efe907cd33c445f60d7c1620b53/manifest/video.m3u8', 0, 'public', '2025-03-29 18:53:01.547', '2025-03-29 18:53:01.547'),
(55, '7d431dd4fb3a2192de8ba857acece92d', 15, 'video', 'completed', '76.13', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/7d431dd4fb3a2192de8ba857acece92d/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/7d431dd4fb3a2192de8ba857acece92d/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-29 18:53:01.547', '2025-03-29 18:53:17.196'),
(59, '8bb4f25c2a3c5bff6756eb27252696ad', 18, 'video', 'completed', '11.67', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/8bb4f25c2a3c5bff6756eb27252696ad/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/8bb4f25c2a3c5bff6756eb27252696ad/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-30 15:01:50.461', '2025-03-30 15:03:00.398'),
(60, 'bb68dbd45045534de16d6e168174b094', 18, 'video', 'completed', '7.51', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/bb68dbd45045534de16d6e168174b094/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/bb68dbd45045534de16d6e168174b094/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-30 15:01:50.461', '2025-03-30 15:03:30.750'),
(61, '6b1db0f1a370b1c9518991521f568545', 18, 'video', 'completed', '7.59', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/6b1db0f1a370b1c9518991521f568545/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/6b1db0f1a370b1c9518991521f568545/thumbnails/thumbnail.jpg', 0, 'public', '2025-03-30 15:01:50.461', '2025-03-30 15:01:53.877'),
(64, 'ae1ee1e826b357a1b2be92c03923fa02', 20, 'video', 'completed', '11.67', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/ae1ee1e826b357a1b2be92c03923fa02/manifest/video.m3u8', '', 'https://customer-wq10bwm9tyr6ssh9.cloudflarestream.com/ae1ee1e826b357a1b2be92c03923fa02/thumbnails/thumbnail.jpg', 0, 'subscribers', '2025-03-30 22:01:20.904', '2025-03-31 19:34:07.800');

-- --------------------------------------------------------

--
-- Table structure for table `UserPoints`
--

CREATE TABLE `UserPoints` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `points` int(11) NOT NULL,
  `conversion_rate` double NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `UserPoints`
--

INSERT INTO `UserPoints` (`id`, `user_id`, `points`, `conversion_rate`, `created_at`, `updated_at`) VALUES
(1, 1, 0, 0, '2025-03-22 22:11:52.984', '2025-03-22 22:11:52.984'),
(2, 2, 945, 0, '2025-03-22 22:19:06.165', '2025-03-23 00:48:26.595'),
(3, 3, 540, 0, '2025-03-23 08:24:12.807', '2025-03-26 15:49:09.175'),
(4, 4, 0, 0, '2025-03-26 15:50:39.465', '2025-03-26 15:50:39.465');

-- --------------------------------------------------------

--
-- Table structure for table `UserPointsPurchase`
--

CREATE TABLE `UserPointsPurchase` (
  `id` int(11) NOT NULL,
  `purchase_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `points` int(11) NOT NULL,
  `amount` double NOT NULL,
  `success` tinyint(1) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `userPointsId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `UserPointsPurchase`
--

INSERT INTO `UserPointsPurchase` (`id`, `purchase_id`, `user_id`, `points`, `amount`, `success`, `created_at`, `updated_at`, `userPointsId`) VALUES
(1, 'PNTecfec7619e15433e84fc09d6f5e1b6f4', 2, 72, 8088, 1, '2025-03-23 00:36:04.947', '2025-03-23 00:36:18.298', NULL),
(2, 'PNTaf4002b99ca0444bbc8982b7962a784a', 2, 810, 90000, 1, '2025-03-23 00:47:38.188', '2025-03-23 00:47:54.824', NULL),
(3, 'PNTe2d24453ded146d3adf322b584e87529', 2, 63, 7000, 1, '2025-03-23 00:48:20.506', '2025-03-23 00:48:26.593', NULL),
(4, 'PNTc04726acee3b441ab4e7bbb88411bcef', 2, 10, 1020, 0, '2025-03-26 14:50:34.736', '2025-03-26 14:50:34.736', NULL),
(5, 'PNT00b9bc1aa40a4c329ecd23ce2ca6d945', 3, 540, 60000, 1, '2025-03-26 15:49:00.346', '2025-03-26 15:49:09.172', NULL),
(6, 'PNT5ffe645e5254416ca9f4da22c49ad05a', 2, 10, 1020, 0, '2025-03-31 19:31:17.214', '2025-03-31 19:31:17.214', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `UserRepost`
--

CREATE TABLE `UserRepost` (
  `id` int(11) NOT NULL,
  `repost_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `UserRepost`
--

INSERT INTO `UserRepost` (`id`, `repost_id`, `user_id`, `post_id`, `created_at`, `updated_at`) VALUES
(1, '9a6b0764-5a93-4053-862c-7297701771e9', 3, 5, '2025-03-24 12:40:27.237', '2025-03-24 12:40:27.237'),
(2, 'c3ef4cf8-aa3f-4bf3-a6b7-c9e42145a1c9', 2, 6, '2025-03-26 14:52:02.056', '2025-03-26 14:52:02.056'),
(3, '6fe7f22a-f345-4a44-be46-79470b0b612c', 3, 6, '2025-03-26 14:56:24.964', '2025-03-26 14:56:24.964'),
(4, '2ca3e509-00cc-43ac-b2ea-02ba18da1cac', 2, 8, '2025-03-28 16:33:49.893', '2025-03-28 16:33:49.893');

-- --------------------------------------------------------

--
-- Table structure for table `UserStory`
--

CREATE TABLE `UserStory` (
  `id` int(11) NOT NULL,
  `story_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `UserStory`
--

INSERT INTO `UserStory` (`id`, `story_id`, `user_id`, `created_at`, `updated_at`) VALUES
(1, 'STRdb62d7f214504ac0a10c20923511c542', 2, '2025-03-27 17:02:27.339', '2025-03-27 17:02:27.339'),
(2, 'STR6259e465612b4de8b9882a5ab6329f40', 2, '2025-03-27 17:04:46.650', '2025-03-27 17:04:46.650'),
(3, 'STR354f77a8a60c491ab5fe20226b22610d', 2, '2025-03-27 17:26:33.975', '2025-03-27 17:26:33.975');

-- --------------------------------------------------------

--
-- Table structure for table `UserSubscriptionCurrent`
--

CREATE TABLE `UserSubscriptionCurrent` (
  `id` int(11) NOT NULL,
  `subscription_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subscription` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `UserSubscriptionHistory`
--

CREATE TABLE `UserSubscriptionHistory` (
  `id` int(11) NOT NULL,
  `subscription_id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `subscription` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  `userSubscriptionCurrentId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `UserTransaction`
--

CREATE TABLE `UserTransaction` (
  `id` int(11) NOT NULL,
  `transaction_id` varchar(191) NOT NULL,
  `user_id` int(11) NOT NULL,
  `wallet_id` int(11) NOT NULL,
  `amount` double NOT NULL,
  `transaction_message` longtext NOT NULL,
  `transaction` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `transaction_type` enum('credit','debit','pending') NOT NULL,
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `UserWallet`
--

CREATE TABLE `UserWallet` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `wallet_id` varchar(191) NOT NULL,
  `balance` double NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `UserWallet`
--

INSERT INTO `UserWallet` (`id`, `user_id`, `wallet_id`, `balance`, `created_at`, `updated_at`) VALUES
(1, 1, '0hhc5ms5dtti', 0, '2025-03-22 22:11:52.984', '2025-03-22 22:11:52.984'),
(2, 2, 'WL7dc1ac6d9b034173b606a3d6285ef0ef', 0, '2025-03-22 22:19:06.165', '2025-03-22 22:19:06.165'),
(3, 3, 'WL039e38583aeb4bba87fec5ee73a553e0', 0, '2025-03-23 08:24:12.807', '2025-03-23 08:24:12.807'),
(4, 4, 'WL477c0dcecf604dd8aaf43a018b1d50b3', 0, '2025-03-26 15:50:39.465', '2025-03-26 15:50:39.465');

-- --------------------------------------------------------

--
-- Table structure for table `UserWithdrawalBankAccount`
--

CREATE TABLE `UserWithdrawalBankAccount` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bank_account_id` varchar(191) NOT NULL,
  `bank_name` varchar(191) NOT NULL,
  `account_name` varchar(191) NOT NULL,
  `account_number` varchar(191) NOT NULL,
  `routing_number` varchar(191) NOT NULL,
  `bank_country` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `WishList`
--

CREATE TABLE `WishList` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `_ConversationsToParticipants`
--

CREATE TABLE `_ConversationsToParticipants` (
  `A` int(11) NOT NULL,
  `B` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_ConversationsToParticipants`
--

INSERT INTO `_ConversationsToParticipants` (`A`, `B`) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(5, 5);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `BlockedGroupParticipant`
--
ALTER TABLE `BlockedGroupParticipant`
  ADD PRIMARY KEY (`id`),
  ADD KEY `BlockedGroupParticipant_user_id_fkey` (`user_id`),
  ADD KEY `BlockedGroupParticipant_group_id_fkey` (`group_id`);

--
-- Indexes for table `Cart`
--
ALTER TABLE `Cart`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Cart_user_id_fkey` (`user_id`),
  ADD KEY `Cart_product_id_fkey` (`product_id`),
  ADD KEY `Cart_size_id_fkey` (`size_id`);

--
-- Indexes for table `CommentImpression`
--
ALTER TABLE `CommentImpression`
  ADD PRIMARY KEY (`id`),
  ADD KEY `CommentImpression_comment_id_fkey` (`comment_id`),
  ADD KEY `CommentImpression_user_id_fkey` (`user_id`);

--
-- Indexes for table `Conversations`
--
ALTER TABLE `Conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Conversations_conversation_id_key` (`conversation_id`);

--
-- Indexes for table `FAQ`
--
ALTER TABLE `FAQ`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `FAQAnswers`
--
ALTER TABLE `FAQAnswers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FAQAnswers_faq_id_fkey` (`faq_id`);

--
-- Indexes for table `Follow`
--
ALTER TABLE `Follow`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Follow_follow_id_key` (`follow_id`),
  ADD KEY `Follow_user_id_fkey` (`user_id`);

--
-- Indexes for table `GlobalPointsBuy`
--
ALTER TABLE `GlobalPointsBuy`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `GroupParticipants`
--
ALTER TABLE `GroupParticipants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `GroupParticipants_user_id_fkey` (`user_id`),
  ADD KEY `GroupParticipants_group_id_fkey` (`group_id`);

--
-- Indexes for table `Groups`
--
ALTER TABLE `Groups`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `GroupSettings`
--
ALTER TABLE `GroupSettings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `GroupSettings_group_id_key` (`group_id`);

--
-- Indexes for table `HelpArticles`
--
ALTER TABLE `HelpArticles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `HelpArticles_article_id_key` (`article_id`),
  ADD KEY `HelpArticles_category_id_fkey` (`category_id`);

--
-- Indexes for table `HelpCategory`
--
ALTER TABLE `HelpCategory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `HelpContact`
--
ALTER TABLE `HelpContact`
  ADD PRIMARY KEY (`id`),
  ADD KEY `HelpContact_user_id_fkey` (`user_id`);

--
-- Indexes for table `LiveStream`
--
ALTER TABLE `LiveStream`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `LiveStream_stream_id_key` (`stream_id`),
  ADD KEY `LiveStream_user_id_fkey` (`user_id`);

--
-- Indexes for table `LiveStreamComment`
--
ALTER TABLE `LiveStreamComment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LiveStreamComment_live_id_fkey` (`live_id`),
  ADD KEY `LiveStreamComment_user_id_fkey` (`user_id`);

--
-- Indexes for table `LiveStreamLike`
--
ALTER TABLE `LiveStreamLike`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LiveStreamLike_live_id_fkey` (`live_id`),
  ADD KEY `LiveStreamLike_user_id_fkey` (`user_id`);

--
-- Indexes for table `LiveStreamParticipants`
--
ALTER TABLE `LiveStreamParticipants`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LiveStreamParticipants_liveStreamId_fkey` (`liveStreamId`);

--
-- Indexes for table `LiveStreamView`
--
ALTER TABLE `LiveStreamView`
  ADD PRIMARY KEY (`id`),
  ADD KEY `LiveStreamView_user_id_fkey` (`user_id`),
  ADD KEY `LiveStreamView_live_id_fkey` (`live_id`);

--
-- Indexes for table `Messages`
--
ALTER TABLE `Messages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Messages_message_id_key` (`message_id`),
  ADD KEY `Messages_sender_id_fkey` (`sender_id`),
  ADD KEY `Messages_conversationsId_fkey` (`conversationsId`);

--
-- Indexes for table `Model`
--
ALTER TABLE `Model`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Model_user_id_key` (`user_id`),
  ADD UNIQUE KEY `Model_token_key` (`token`);

--
-- Indexes for table `ModelSubscriptionPack`
--
ALTER TABLE `ModelSubscriptionPack`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ModelSubscriptionPack_user_id_key` (`user_id`);

--
-- Indexes for table `ModelSubscriptionTier`
--
ALTER TABLE `ModelSubscriptionTier`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ModelSubscriptionTier_subscription_id_fkey` (`subscription_id`);

--
-- Indexes for table `Notifications`
--
ALTER TABLE `Notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Notifications_user_id_fkey` (`user_id`);

--
-- Indexes for table `Order`
--
ALTER TABLE `Order`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Order_order_id_key` (`order_id`),
  ADD UNIQUE KEY `Order_transaction_id_key` (`transaction_id`),
  ADD KEY `Order_user_id_fkey` (`user_id`);

--
-- Indexes for table `OrderProduct`
--
ALTER TABLE `OrderProduct`
  ADD PRIMARY KEY (`id`),
  ADD KEY `OrderProduct_order_id_fkey` (`order_id`),
  ADD KEY `OrderProduct_product_id_fkey` (`product_id`);

--
-- Indexes for table `Participants`
--
ALTER TABLE `Participants`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `PointConversionRate`
--
ALTER TABLE `PointConversionRate`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `PointConversionRateUsers`
--
ALTER TABLE `PointConversionRateUsers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PointConversionRateUsers_user_id_fkey` (`user_id`),
  ADD KEY `PointConversionRateUsers_pointConversionRateId_fkey` (`pointConversionRateId`);

--
-- Indexes for table `Post`
--
ALTER TABLE `Post`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Post_user_id_fkey` (`user_id`);

--
-- Indexes for table `PostComment`
--
ALTER TABLE `PostComment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PostComment_post_id_fkey` (`post_id`),
  ADD KEY `PostComment_user_id_fkey` (`user_id`);

--
-- Indexes for table `PostCommentAttachments`
--
ALTER TABLE `PostCommentAttachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PostCommentAttachments_comment_id_fkey` (`comment_id`);

--
-- Indexes for table `PostCommentLikes`
--
ALTER TABLE `PostCommentLikes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PostCommentLikes_comment_id_fkey` (`comment_id`),
  ADD KEY `PostCommentLikes_user_id_fkey` (`user_id`);

--
-- Indexes for table `PostImpression`
--
ALTER TABLE `PostImpression`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PostImpression_post_id_fkey` (`post_id`),
  ADD KEY `PostImpression_user_id_fkey` (`user_id`);

--
-- Indexes for table `PostLike`
--
ALTER TABLE `PostLike`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PostLike_post_id_fkey` (`post_id`),
  ADD KEY `PostLike_user_id_fkey` (`user_id`);

--
-- Indexes for table `PostShared`
--
ALTER TABLE `PostShared`
  ADD PRIMARY KEY (`id`),
  ADD KEY `PostShared_post_id_fkey` (`post_id`),
  ADD KEY `PostShared_user_id_fkey` (`user_id`);

--
-- Indexes for table `Product`
--
ALTER TABLE `Product`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Product_product_id_key` (`product_id`),
  ADD KEY `Product_category_id_fkey` (`category_id`);

--
-- Indexes for table `ProductCategory`
--
ALTER TABLE `ProductCategory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ProductImages`
--
ALTER TABLE `ProductImages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProductImages_product_id_fkey` (`product_id`);

--
-- Indexes for table `ProductSize`
--
ALTER TABLE `ProductSize`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ProductSizePivot`
--
ALTER TABLE `ProductSizePivot`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProductSizePivot_product_id_fkey` (`product_id`),
  ADD KEY `ProductSizePivot_size_id_fkey` (`size_id`);

--
-- Indexes for table `ReportComment`
--
ALTER TABLE `ReportComment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ReportComment_comment_id_fkey` (`comment_id`),
  ADD KEY `ReportComment_user_id_fkey` (`user_id`);

--
-- Indexes for table `ReportLive`
--
ALTER TABLE `ReportLive`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ReportLive_live_id_fkey` (`live_id`),
  ADD KEY `ReportLive_user_id_fkey` (`user_id`);

--
-- Indexes for table `ReportMessage`
--
ALTER TABLE `ReportMessage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ReportMessage_message_id_fkey` (`message_id`),
  ADD KEY `ReportMessage_user_id_fkey` (`user_id`);

--
-- Indexes for table `ReportPost`
--
ALTER TABLE `ReportPost`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ReportPost_post_id_fkey` (`post_id`),
  ADD KEY `ReportPost_user_id_fkey` (`user_id`);

--
-- Indexes for table `ReportUser`
--
ALTER TABLE `ReportUser`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ReportUser_user_id_fkey` (`user_id`);

--
-- Indexes for table `Settings`
--
ALTER TABLE `Settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Settings_user_id_key` (`user_id`),
  ADD KEY `Settings_user_id_fkey` (`user_id`);

--
-- Indexes for table `StoryMedia`
--
ALTER TABLE `StoryMedia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `StoryMedia_user_id_fkey` (`user_id`);

--
-- Indexes for table `Subscribers`
--
ALTER TABLE `Subscribers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Subscribers_user_id_fkey` (`user_id`);

--
-- Indexes for table `User`
--
ALTER TABLE `User`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`),
  ADD UNIQUE KEY `User_user_id_key` (`user_id`),
  ADD UNIQUE KEY `User_username_key` (`username`),
  ADD UNIQUE KEY `User_phone_key` (`phone`);

--
-- Indexes for table `UserAttachments`
--
ALTER TABLE `UserAttachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UserAttachments_user_id_fkey` (`user_id`);

--
-- Indexes for table `UserBanks`
--
ALTER TABLE `UserBanks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UserBanks_account_number_key` (`account_number`),
  ADD KEY `UserBanks_user_id_fkey` (`user_id`);

--
-- Indexes for table `UserMedia`
--
ALTER TABLE `UserMedia`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UserMedia_media_id_key` (`media_id`),
  ADD KEY `UserMedia_user_id_fkey` (`post_id`);

--
-- Indexes for table `UserPoints`
--
ALTER TABLE `UserPoints`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UserPoints_user_id_key` (`user_id`);

--
-- Indexes for table `UserPointsPurchase`
--
ALTER TABLE `UserPointsPurchase`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UserPointsPurchase_purchase_id_key` (`purchase_id`),
  ADD KEY `UserPointsPurchase_userPointsId_fkey` (`userPointsId`);

--
-- Indexes for table `UserRepost`
--
ALTER TABLE `UserRepost`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UserRepost_post_id_fkey` (`post_id`),
  ADD KEY `UserRepost_user_id_fkey` (`user_id`);

--
-- Indexes for table `UserStory`
--
ALTER TABLE `UserStory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UserStory_user_id_fkey` (`user_id`);

--
-- Indexes for table `UserSubscriptionCurrent`
--
ALTER TABLE `UserSubscriptionCurrent`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UserSubscriptionCurrent_user_id_fkey` (`user_id`);

--
-- Indexes for table `UserSubscriptionHistory`
--
ALTER TABLE `UserSubscriptionHistory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UserSubscriptionHistory_userSubscriptionCurrentId_fkey` (`userSubscriptionCurrentId`);

--
-- Indexes for table `UserTransaction`
--
ALTER TABLE `UserTransaction`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UserTransaction_user_id_fkey` (`user_id`),
  ADD KEY `UserTransaction_wallet_id_fkey` (`wallet_id`);

--
-- Indexes for table `UserWallet`
--
ALTER TABLE `UserWallet`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UserWallet_user_id_fkey` (`user_id`);

--
-- Indexes for table `UserWithdrawalBankAccount`
--
ALTER TABLE `UserWithdrawalBankAccount`
  ADD PRIMARY KEY (`id`),
  ADD KEY `UserWithdrawalBankAccount_user_id_fkey` (`user_id`);

--
-- Indexes for table `WishList`
--
ALTER TABLE `WishList`
  ADD PRIMARY KEY (`id`),
  ADD KEY `WishList_user_id_fkey` (`user_id`),
  ADD KEY `WishList_product_id_fkey` (`product_id`);

--
-- Indexes for table `_ConversationsToParticipants`
--
ALTER TABLE `_ConversationsToParticipants`
  ADD UNIQUE KEY `_ConversationsToParticipants_AB_unique` (`A`,`B`),
  ADD KEY `_ConversationsToParticipants_B_index` (`B`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `BlockedGroupParticipant`
--
ALTER TABLE `BlockedGroupParticipant`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Cart`
--
ALTER TABLE `Cart`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `CommentImpression`
--
ALTER TABLE `CommentImpression`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Conversations`
--
ALTER TABLE `Conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `FAQ`
--
ALTER TABLE `FAQ`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `FAQAnswers`
--
ALTER TABLE `FAQAnswers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Follow`
--
ALTER TABLE `Follow`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `GlobalPointsBuy`
--
ALTER TABLE `GlobalPointsBuy`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `GroupParticipants`
--
ALTER TABLE `GroupParticipants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Groups`
--
ALTER TABLE `Groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `GroupSettings`
--
ALTER TABLE `GroupSettings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `HelpArticles`
--
ALTER TABLE `HelpArticles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `HelpCategory`
--
ALTER TABLE `HelpCategory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `HelpContact`
--
ALTER TABLE `HelpContact`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `LiveStream`
--
ALTER TABLE `LiveStream`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `LiveStreamComment`
--
ALTER TABLE `LiveStreamComment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `LiveStreamLike`
--
ALTER TABLE `LiveStreamLike`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `LiveStreamParticipants`
--
ALTER TABLE `LiveStreamParticipants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `LiveStreamView`
--
ALTER TABLE `LiveStreamView`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Messages`
--
ALTER TABLE `Messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `Model`
--
ALTER TABLE `Model`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ModelSubscriptionPack`
--
ALTER TABLE `ModelSubscriptionPack`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `ModelSubscriptionTier`
--
ALTER TABLE `ModelSubscriptionTier`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Notifications`
--
ALTER TABLE `Notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `Order`
--
ALTER TABLE `Order`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `OrderProduct`
--
ALTER TABLE `OrderProduct`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Participants`
--
ALTER TABLE `Participants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `PointConversionRate`
--
ALTER TABLE `PointConversionRate`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `PointConversionRateUsers`
--
ALTER TABLE `PointConversionRateUsers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Post`
--
ALTER TABLE `Post`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `PostComment`
--
ALTER TABLE `PostComment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `PostCommentAttachments`
--
ALTER TABLE `PostCommentAttachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `PostCommentLikes`
--
ALTER TABLE `PostCommentLikes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `PostImpression`
--
ALTER TABLE `PostImpression`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `PostLike`
--
ALTER TABLE `PostLike`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `PostShared`
--
ALTER TABLE `PostShared`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Product`
--
ALTER TABLE `Product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `ProductCategory`
--
ALTER TABLE `ProductCategory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ProductImages`
--
ALTER TABLE `ProductImages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `ProductSize`
--
ALTER TABLE `ProductSize`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `ProductSizePivot`
--
ALTER TABLE `ProductSizePivot`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `ReportComment`
--
ALTER TABLE `ReportComment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ReportLive`
--
ALTER TABLE `ReportLive`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ReportMessage`
--
ALTER TABLE `ReportMessage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ReportPost`
--
ALTER TABLE `ReportPost`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ReportUser`
--
ALTER TABLE `ReportUser`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Settings`
--
ALTER TABLE `Settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `StoryMedia`
--
ALTER TABLE `StoryMedia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `Subscribers`
--
ALTER TABLE `Subscribers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `User`
--
ALTER TABLE `User`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `UserAttachments`
--
ALTER TABLE `UserAttachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `UserBanks`
--
ALTER TABLE `UserBanks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `UserMedia`
--
ALTER TABLE `UserMedia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT for table `UserPoints`
--
ALTER TABLE `UserPoints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `UserPointsPurchase`
--
ALTER TABLE `UserPointsPurchase`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `UserRepost`
--
ALTER TABLE `UserRepost`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `UserStory`
--
ALTER TABLE `UserStory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `UserSubscriptionCurrent`
--
ALTER TABLE `UserSubscriptionCurrent`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `UserSubscriptionHistory`
--
ALTER TABLE `UserSubscriptionHistory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `UserTransaction`
--
ALTER TABLE `UserTransaction`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `UserWallet`
--
ALTER TABLE `UserWallet`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `UserWithdrawalBankAccount`
--
ALTER TABLE `UserWithdrawalBankAccount`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `WishList`
--
ALTER TABLE `WishList`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `BlockedGroupParticipant`
--
ALTER TABLE `BlockedGroupParticipant`
  ADD CONSTRAINT `BlockedGroupParticipant_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `Groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `BlockedGroupParticipant_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Cart`
--
ALTER TABLE `Cart`
  ADD CONSTRAINT `Cart_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Cart_size_id_fkey` FOREIGN KEY (`size_id`) REFERENCES `ProductSize` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Cart_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `CommentImpression`
--
ALTER TABLE `CommentImpression`
  ADD CONSTRAINT `CommentImpression_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `PostComment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CommentImpression_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `FAQAnswers`
--
ALTER TABLE `FAQAnswers`
  ADD CONSTRAINT `FAQAnswers_faq_id_fkey` FOREIGN KEY (`faq_id`) REFERENCES `FAQ` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Follow`
--
ALTER TABLE `Follow`
  ADD CONSTRAINT `Follow_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `GroupParticipants`
--
ALTER TABLE `GroupParticipants`
  ADD CONSTRAINT `GroupParticipants_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `Groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `GroupParticipants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `GroupSettings`
--
ALTER TABLE `GroupSettings`
  ADD CONSTRAINT `GroupSettings_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `Groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `HelpArticles`
--
ALTER TABLE `HelpArticles`
  ADD CONSTRAINT `HelpArticles_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `HelpCategory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `HelpContact`
--
ALTER TABLE `HelpContact`
  ADD CONSTRAINT `HelpContact_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `LiveStream`
--
ALTER TABLE `LiveStream`
  ADD CONSTRAINT `LiveStream_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `LiveStreamComment`
--
ALTER TABLE `LiveStreamComment`
  ADD CONSTRAINT `LiveStreamComment_live_id_fkey` FOREIGN KEY (`live_id`) REFERENCES `LiveStream` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LiveStreamComment_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `LiveStreamLike`
--
ALTER TABLE `LiveStreamLike`
  ADD CONSTRAINT `LiveStreamLike_live_id_fkey` FOREIGN KEY (`live_id`) REFERENCES `LiveStream` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LiveStreamLike_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `LiveStreamParticipants`
--
ALTER TABLE `LiveStreamParticipants`
  ADD CONSTRAINT `LiveStreamParticipants_liveStreamId_fkey` FOREIGN KEY (`liveStreamId`) REFERENCES `LiveStream` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `LiveStreamView`
--
ALTER TABLE `LiveStreamView`
  ADD CONSTRAINT `LiveStreamView_live_id_fkey` FOREIGN KEY (`live_id`) REFERENCES `LiveStream` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LiveStreamView_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Messages`
--
ALTER TABLE `Messages`
  ADD CONSTRAINT `Messages_conversationsId_fkey` FOREIGN KEY (`conversationsId`) REFERENCES `Conversations` (`conversation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `User` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Model`
--
ALTER TABLE `Model`
  ADD CONSTRAINT `Model_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ModelSubscriptionPack`
--
ALTER TABLE `ModelSubscriptionPack`
  ADD CONSTRAINT `ModelSubscriptionPack_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ModelSubscriptionTier`
--
ALTER TABLE `ModelSubscriptionTier`
  ADD CONSTRAINT `ModelSubscriptionTier_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `ModelSubscriptionPack` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Notifications`
--
ALTER TABLE `Notifications`
  ADD CONSTRAINT `Notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Order`
--
ALTER TABLE `Order`
  ADD CONSTRAINT `Order_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `OrderProduct`
--
ALTER TABLE `OrderProduct`
  ADD CONSTRAINT `OrderProduct_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `OrderProduct_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `PointConversionRateUsers`
--
ALTER TABLE `PointConversionRateUsers`
  ADD CONSTRAINT `PointConversionRateUsers_pointConversionRateId_fkey` FOREIGN KEY (`pointConversionRateId`) REFERENCES `PointConversionRate` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `PointConversionRateUsers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Post`
--
ALTER TABLE `Post`
  ADD CONSTRAINT `Post_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `PostComment`
--
ALTER TABLE `PostComment`
  ADD CONSTRAINT `PostComment_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PostComment_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `PostCommentAttachments`
--
ALTER TABLE `PostCommentAttachments`
  ADD CONSTRAINT `PostCommentAttachments_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `PostComment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `PostCommentLikes`
--
ALTER TABLE `PostCommentLikes`
  ADD CONSTRAINT `PostCommentLikes_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `PostComment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PostCommentLikes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `PostImpression`
--
ALTER TABLE `PostImpression`
  ADD CONSTRAINT `PostImpression_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PostImpression_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `PostLike`
--
ALTER TABLE `PostLike`
  ADD CONSTRAINT `PostLike_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PostLike_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `PostShared`
--
ALTER TABLE `PostShared`
  ADD CONSTRAINT `PostShared_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `PostShared_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `Product`
--
ALTER TABLE `Product`
  ADD CONSTRAINT `Product_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `ProductCategory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ProductImages`
--
ALTER TABLE `ProductImages`
  ADD CONSTRAINT `ProductImages_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ProductSizePivot`
--
ALTER TABLE `ProductSizePivot`
  ADD CONSTRAINT `ProductSizePivot_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProductSizePivot_size_id_fkey` FOREIGN KEY (`size_id`) REFERENCES `ProductSize` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ReportComment`
--
ALTER TABLE `ReportComment`
  ADD CONSTRAINT `ReportComment_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `PostComment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ReportComment_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ReportLive`
--
ALTER TABLE `ReportLive`
  ADD CONSTRAINT `ReportLive_live_id_fkey` FOREIGN KEY (`live_id`) REFERENCES `LiveStream` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ReportLive_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ReportMessage`
--
ALTER TABLE `ReportMessage`
  ADD CONSTRAINT `ReportMessage_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `Messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ReportMessage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ReportPost`
--
ALTER TABLE `ReportPost`
  ADD CONSTRAINT `ReportPost_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ReportPost_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ReportUser`
--
ALTER TABLE `ReportUser`
  ADD CONSTRAINT `ReportUser_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Settings`
--
ALTER TABLE `Settings`
  ADD CONSTRAINT `Settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `StoryMedia`
--
ALTER TABLE `StoryMedia`
  ADD CONSTRAINT `StoryMedia_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `UserStory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Subscribers`
--
ALTER TABLE `Subscribers`
  ADD CONSTRAINT `Subscribers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserAttachments`
--
ALTER TABLE `UserAttachments`
  ADD CONSTRAINT `UserAttachments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserBanks`
--
ALTER TABLE `UserBanks`
  ADD CONSTRAINT `UserBanks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserMedia`
--
ALTER TABLE `UserMedia`
  ADD CONSTRAINT `UserMedia_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserPoints`
--
ALTER TABLE `UserPoints`
  ADD CONSTRAINT `UserPoints_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserPointsPurchase`
--
ALTER TABLE `UserPointsPurchase`
  ADD CONSTRAINT `UserPointsPurchase_userPointsId_fkey` FOREIGN KEY (`userPointsId`) REFERENCES `UserPoints` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `UserRepost`
--
ALTER TABLE `UserRepost`
  ADD CONSTRAINT `UserRepost_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `UserRepost_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserStory`
--
ALTER TABLE `UserStory`
  ADD CONSTRAINT `UserStory_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserSubscriptionCurrent`
--
ALTER TABLE `UserSubscriptionCurrent`
  ADD CONSTRAINT `UserSubscriptionCurrent_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserSubscriptionHistory`
--
ALTER TABLE `UserSubscriptionHistory`
  ADD CONSTRAINT `UserSubscriptionHistory_userSubscriptionCurrentId_fkey` FOREIGN KEY (`userSubscriptionCurrentId`) REFERENCES `UserSubscriptionCurrent` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `UserTransaction`
--
ALTER TABLE `UserTransaction`
  ADD CONSTRAINT `UserTransaction_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `UserTransaction_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `UserWallet` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserWallet`
--
ALTER TABLE `UserWallet`
  ADD CONSTRAINT `UserWallet_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `UserWithdrawalBankAccount`
--
ALTER TABLE `UserWithdrawalBankAccount`
  ADD CONSTRAINT `UserWithdrawalBankAccount_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `WishList`
--
ALTER TABLE `WishList`
  ADD CONSTRAINT `WishList_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WishList_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `_ConversationsToParticipants`
--
ALTER TABLE `_ConversationsToParticipants`
  ADD CONSTRAINT `_ConversationsToParticipants_A_fkey` FOREIGN KEY (`A`) REFERENCES `Conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `_ConversationsToParticipants_B_fkey` FOREIGN KEY (`B`) REFERENCES `Participants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
